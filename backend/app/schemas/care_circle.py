import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.care_circle import PermissionScope, CareCircleStatus


class CareCircleInvite(BaseModel):
    doctor_email: str
    permission_scope: PermissionScope = PermissionScope.FULL


class CareCircleResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    permission_scope: PermissionScope
    status: CareCircleStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class CareCircleUpdate(BaseModel):
    permission_scope: PermissionScope | None = None
    status: CareCircleStatus | None = None