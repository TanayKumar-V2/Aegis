import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.care_circle import CareCircle, CareCircleStatus
from app.schemas.care_circle import CareCircleInvite, CareCircleResponse, CareCircleUpdate
from app.middleware.auth_dependency import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])


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

    if payload.permission_scope is not None:
        circle.permission_scope = payload.permission_scope
    if payload.status is not None:
        circle.status = payload.status

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