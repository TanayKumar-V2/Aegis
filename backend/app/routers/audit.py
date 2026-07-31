import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse
from app.middleware.auth_dependency import get_current_user

router = APIRouter(prefix="/patients/{patient_id}/audit-log", tags=["audit"])


@router.get("", response_model=list[AuditLogResponse])
async def get_audit_log(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Only the patient themselves can view their full audit trail —
    # not even doctors with active care-circle access get this view.
    # Seeing "who looked at my record and when" is the patient's own
    # oversight tool, not something to expose to the doctors being audited.
    if current_user.role != UserRole.PATIENT or current_user.id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the patient can view their own audit log",
        )

    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.patient_id == patient_id)
        .order_by(AuditLog.timestamp.desc())
    )
    return result.scalars().all()