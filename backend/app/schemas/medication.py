import uuid
from datetime import date, datetime

from pydantic import BaseModel


class MedicationCreate(BaseModel):
    drug_name: str
    dosage: str
    frequency: str
    start_date: date
    end_date: date | None = None


class MedicationResponse(BaseModel):
    id: uuid.UUID
    entry_id: uuid.UUID
    patient_id: uuid.UUID
    drug_name: str
    rxcui: str | None
    dosage: str
    frequency: str
    start_date: date
    end_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InteractionFlagResponse(BaseModel):
    id: uuid.UUID
    medication_id_a: uuid.UUID
    medication_id_b: uuid.UUID
    severity: str
    description: str
    resolved: bool

    model_config = {"from_attributes": True}