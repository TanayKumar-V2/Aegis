import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.interaction_flag import InteractionSeverity


class FlagResolve(BaseModel):
    resolution_note: str | None = None


class FlagDetailResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    medication_id_a: uuid.UUID
    medication_id_b: uuid.UUID
    severity: InteractionSeverity
    description: str
    resolved: bool
    resolved_by: uuid.UUID | None
    resolved_at: datetime | None
    resolution_note: str | None
    flagged_at: datetime

    model_config = {"from_attributes": True}