import uuid
import re
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.care_circle import CareCircle, CareCircleStatus
from app.models.entry import Entry
from app.models.interaction_flag import InteractionFlag
from app.models.medication import Medication
from app.schemas.care_circle import (
    CareCircleInvite,
    CareCircleResponse,
    CareCircleUpdate,
    PatientCareCircleResponse,
)
from app.middleware.auth_dependency import get_current_user
from app.middleware.care_circle_permission import require_patient_access
from app.services.audit import log_action
from app.services.pdf_export import generate_patient_pdf

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


@router.get("/{patient_id}/export-pdf")
async def export_patient_pdf(
    patient_id: uuid.UUID,
    current_user: User = Depends(require_patient_access()),
    db: AsyncSession = Depends(get_db),
):
    patient_result = await db.execute(select(User).where(User.id == patient_id))
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    entries_result = await db.execute(
        select(Entry).where(Entry.patient_id == patient_id).order_by(Entry.created_at.desc())
    )
    entries = list(entries_result.scalars().all())

    medications_result = await db.execute(
        select(Medication)
        .join(Entry, Medication.entry_id == Entry.id)
        .where(Medication.patient_id == patient_id)
        .order_by(Medication.start_date.desc())
    )
    medications = list(medications_result.scalars().all())

    flags_result = await db.execute(
        select(InteractionFlag)
        .where(
            and_(
                InteractionFlag.patient_id == patient_id,
                InteractionFlag.resolved.is_(False),
            )
        )
        .order_by(InteractionFlag.flagged_at.desc())
    )
    flags = list(flags_result.scalars().all())

    pdf_bytes = generate_patient_pdf(patient, entries, medications, flags)
    await log_action(
        db=db,
        actor_id=current_user.id,
        patient_id=patient_id,
        action="exported_pdf",
        metadata={
            "entry_count": len(entries),
            "active_medication_count": sum(medication.is_active for medication in medications),
            "unresolved_flag_count": len(flags),
        },
    )
    await db.commit()

    safe_name = re.sub(r"[^A-Za-z0-9]+", "-", patient.name).strip("-").lower()
    filename = f"aegis-export-{safe_name}-{date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
