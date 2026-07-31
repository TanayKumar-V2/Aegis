import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.entry import EntryType


class EntryCreate(BaseModel):
    entry_type: EntryType
    title: str
    content: str


class EntryResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    author_id: uuid.UUID
    entry_type: EntryType
    specialty_tag: str
    title: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}