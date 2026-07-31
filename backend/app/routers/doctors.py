import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_dependency import get_current_user
from app.models.care_circle import CareCircle, CareCircleStatus
from app.models.user import User, UserRole
from app.schemas.care_circle import DoctorPatientResponse

router = APIRouter(prefix="/doctors", tags=["doctors"])


CARE_CIRCLE_STATUS_ORDER = case(
    (CareCircle.status == CareCircleStatus.ACTIVE, 0),
    (CareCircle.status == CareCircleStatus.PENDING, 1),
    (CareCircle.status == CareCircleStatus.REVOKED, 2),
    else_=3,
)


@router.get("/me/patients", response_model=list[DoctorPatientResponse])
async def list_doctor_patients(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can view their patient list",
        )

    result = await db.execute(
        select(CareCircle, User)
        .join(User, User.id == CareCircle.patient_id)
        .where(CareCircle.doctor_id == current_user.id)
        .order_by(CARE_CIRCLE_STATUS_ORDER, CareCircle.created_at.desc())
    )

    return [
        DoctorPatientResponse(
            circle_id=circle.id,
            patient_id=patient.id,
            patient_name=patient.name,
            patient_email=patient.email,
            permission_scope=circle.permission_scope,
            status=circle.status,
            created_at=circle.created_at,
        )
        for circle, patient in result.all()
    ]
