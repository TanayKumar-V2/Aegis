import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.entry import Entry
from app.schemas.entry import EntryCreate, EntryResponse
from app.middleware.auth_dependency import get_current_user
from app.middleware.care_circle_permission import require_patient_access
from app.services.audit import log_action

router = APIRouter(prefix="/patients/{patient_id}/entries", tags=["entries"])


@router.post("", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    patient_id: uuid.UUID,
    payload: EntryCreate,
    current_user: User = Depends(require_patient_access()),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can create entries",
        )

    entry = Entry(
        patient_id=patient_id,
        author_id=current_user.id,
        entry_type=payload.entry_type,
        specialty_tag=current_user.specialty or "General",
        title=payload.title,
        content=payload.content,
    )
    db.add(entry)
    await db.flush()  

    await log_action(
        db=db,
        actor_id=current_user.id,
        patient_id=patient_id,
        action="created_entry",
        entry_id=entry.id,
        metadata={"entry_type": payload.entry_type.value, "specialty": entry.specialty_tag},
    )

    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("", response_model=list[EntryResponse])
async def get_timeline(
    patient_id: uuid.UUID,
    current_user: User = Depends(require_patient_access()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Entry).where(Entry.patient_id == patient_id).order_by(Entry.created_at.desc())
    )
    entries = result.scalars().all()

    await log_action(
        db=db,
        actor_id=current_user.id,
        patient_id=patient_id,
        action="viewed_timeline",
    )
    await db.commit()

    return entries