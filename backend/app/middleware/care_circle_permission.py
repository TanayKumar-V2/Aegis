import uuid

from fastapi import Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.care_circle import CareCircle, CareCircleStatus, PermissionScope
from app.middleware.auth_dependency import get_current_user


async def verify_patient_access(
    patient_id: uuid.UUID,
    required_scope: PermissionScope | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    # A patient always has full access to their own record
    if current_user.role == UserRole.PATIENT:
        if current_user.id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access another patient's record",
            )
        return current_user

    # Doctors and caregivers must have an active care_circle entry
    result = await db.execute(
        select(CareCircle).where(
            and_(
                CareCircle.patient_id == patient_id,
                CareCircle.doctor_id == current_user.id,
                CareCircle.status == CareCircleStatus.ACTIVE,
            )
        )
    )
    circle = result.scalar_one_or_none()

    if not circle:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have active access to this patient's record",
        )

    # If a route requires a specific scope (e.g. prescriptions), enforce it —
    # FULL access always satisfies any narrower requirement
    if required_scope and circle.permission_scope != PermissionScope.FULL:
        if circle.permission_scope != required_scope:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your access scope does not include {required_scope.value}",
            )

    return current_user


def require_patient_access(required_scope: PermissionScope | None = None):
    async def dependency(
        patient_id: uuid.UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        return await verify_patient_access(patient_id, required_scope, current_user, db)

    return dependency