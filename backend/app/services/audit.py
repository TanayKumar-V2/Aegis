import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def log_action(
    db: AsyncSession,
    actor_id: uuid.UUID,
    patient_id: uuid.UUID,
    action: str,
    entry_id: uuid.UUID | None = None,
    metadata: dict | None = None,
) -> None:
    """
    Records an audit entry. Does NOT commit — callers should let this
    ride along with their existing transaction's commit, so a logging
    failure can never silently succeed while the real action fails,
    or vice versa.
    """
    log = AuditLog(
        actor_id=actor_id,
        patient_id=patient_id,
        action=action,
        entry_id=entry_id,
        metadata_json=metadata,
    )
    db.add(log)