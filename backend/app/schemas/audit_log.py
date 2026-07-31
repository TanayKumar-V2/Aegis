import uuid
from datetime import datetime

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    actor_id: uuid.UUID
    patient_id: uuid.UUID
    action: str
    entry_id: uuid.UUID | None
    metadata_json: dict | None
    timestamp: datetime

    model_config = {"from_attributes": True}