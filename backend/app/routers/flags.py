import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.interaction_flag import InteractionFlag
from app.schemas.flag import FlagResolve, FlagDetailResponse
from app.middleware.care_circle_permission import require_patient_access
from datetime import datetime, timezone
from app.services.audit import log_action

router = APIRouter(prefix="/patients/{patient_id}/flags", tags=["flags"])


@router.get("", response_model=list[FlagDetailResponse])
async def get_flags(
    patient_id: uuid.UUID,
    current_user: User = Depends(require_patient_access()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InteractionFlag)
        .where(InteractionFlag.patient_id == patient_id)
        .order_by(InteractionFlag.flagged_at.desc())
    )
    return result.scalars().all()


@router.patch("/{flag_id}/resolve", response_model=FlagDetailResponse)
async def resolve_flag(
    patient_id: uuid.UUID,
    flag_id: uuid.UUID,
    payload: FlagResolve,
    current_user: User = Depends(require_patient_access()),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can resolve interaction flags",
        )

    result = await db.execute(
        select(InteractionFlag).where(
            InteractionFlag.id == flag_id, InteractionFlag.patient_id == patient_id
        )
    )
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Interaction flag not found")

    if flag.resolved:
        raise HTTPException(status_code=400, detail="This flag is already resolved")

    flag.resolved = True
    flag.resolved_by = current_user.id
    flag.resolved_at = datetime.now(timezone.utc)
    flag.resolution_note = payload.resolution_note

    await log_action(
        db=db,
        actor_id=current_user.id,
        patient_id=patient_id,
        action="resolved_flag",
        metadata={
            "flag_id": str(flag.id),
            "severity": flag.severity.value,
            "resolution_note": payload.resolution_note,
        },
    )

    await db.commit()
    await db.refresh(flag)
    return flag