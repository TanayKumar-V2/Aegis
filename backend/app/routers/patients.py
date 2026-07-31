import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.care_circle import CareCircle, CareCircleStatus
from app.schemas.care_circle import (
    CareCircleInvite,
    CareCircleResponse,
    CareCircleUpdate,
    PatientCareCircleResponse,
)
from app.middleware.auth_dependency import get_current_user
from app.services.audit import log_action

router = APIRouter(prefix="/patients", tags=["patients"])


CARE_CIRCLE_STATUS_ORDER = case(
    (CareCircle.status == CareCircleStatus.ACTIVE, 0),
    (CareCircle.status == CareCircleStatus.PENDING, 1),
    (CareCircle.status == CareCircleStatus.REVOKED, 2),
    else_=3,
)


@router.post(
    "/{patient_id}/invite-doctor",
    response_model=CareCircleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def invite_doctor(
    patient_id: uuid.UUID,
    payload: CareCircleInvite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.PATIENT or current_user.id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the patient can invite doctors into their own care circle",
        )

    result = await db.execute(
        select(User).where(
            and_(User.email == payload.doctor_email, User.role == UserRole.DOCTOR)
        )
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="No doctor found with that email")

    existing = await db.execute(
        select(CareCircle).where(
            and_(CareCircle.patient_id == patient_id, CareCircle.doctor_id == doctor.id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400, detail="This doctor is already in your care circle"
        )

    circle = CareCircle(
        patient_id=patient_id,
        doctor_id=doctor.id,
        permission_scope=payload.permission_scope,
        status=CareCircleStatus.PENDING,
    )
    db.add(circle)
    await db.commit()
    await db.refresh(circle)
    return circle


@router.patch("/care-circles/{circle_id}/permissions", response_model=CareCircleResponse)
async def update_care_circle(
    circle_id: uuid.UUID,
    payload: CareCircleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CareCircle).where(CareCircle.id == circle_id))
    circle = result.scalar_one_or_none()

    if not circle:
        raise HTTPException(status_code=404, detail="Care circle entry not found")

    if current_user.id != circle.patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the patient can modify their own care circle",
        )

    old_scope = circle.permission_scope.value
    old_status = circle.status.value

    if payload.permission_scope is not None:
        circle.permission_scope = payload.permission_scope
    if payload.status is not None:
        circle.status = payload.status

    action = "revoked_access" if payload.status and payload.status.value == "revoked" else "permission_scope_changed"

    await log_action(
        db=db,
        actor_id=current_user.id,
        patient_id=circle.patient_id,
        action=action,
        metadata={
            "circle_id": str(circle.id),
            "doctor_id": str(circle.doctor_id),
            "old_scope": old_scope,
            "new_scope": circle.permission_scope.value,
            "old_status": old_status,
            "new_status": circle.status.value,
        },
    )

    await db.commit()
    await db.refresh(circle)
    return circle

@router.post("/care-circles/{circle_id}/accept", response_model=CareCircleResponse)
async def accept_invite(
    circle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CareCircle).where(CareCircle.id == circle_id))
    circle = result.scalar_one_or_none()

    if not circle:
        raise HTTPException(status_code=404, detail="Care circle entry not found")

    if current_user.role != UserRole.DOCTOR or current_user.id != circle.doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the invited doctor can accept this invite",
        )

    if circle.status != CareCircleStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"This invite is already {circle.status.value}, cannot accept",
        )

    circle.status = CareCircleStatus.ACTIVE
    await db.commit()
    await db.refresh(circle)
    return circle


@router.get(
    "/{patient_id}/care-circle",
    response_model=list[PatientCareCircleResponse],
)
async def list_patient_care_circle(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.PATIENT or current_user.id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the patient can view their own care circle",
        )

    result = await db.execute(
        select(CareCircle, User)
        .join(User, User.id == CareCircle.doctor_id)
        .where(CareCircle.patient_id == patient_id)
        .order_by(CARE_CIRCLE_STATUS_ORDER, CareCircle.created_at.desc())
    )

    return [
        PatientCareCircleResponse(
            circle_id=circle.id,
            doctor_id=doctor.id,
            doctor_name=doctor.name,
            doctor_email=doctor.email,
            doctor_specialty=doctor.specialty,
            permission_scope=circle.permission_scope,
            status=circle.status,
            created_at=circle.created_at,
        )
        for circle, doctor in result.all()
    ]
