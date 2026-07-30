import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import ForeignKey, DateTime, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class PermissionScope(str, Enum):
    FULL = "full"
    NOTES_ONLY = "notes_only"
    PRESCRIPTIONS_ONLY = "prescriptions_only"


class CareCircleStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    REVOKED = "revoked"


class CareCircle(Base):
    __tablename__ = "care_circles"
    __table_args__ = (
        UniqueConstraint("patient_id", "doctor_id", name="uq_patient_doctor"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    permission_scope: Mapped[PermissionScope] = mapped_column(
        SQLEnum(PermissionScope), nullable=False, default=PermissionScope.FULL
    )
    status: Mapped[CareCircleStatus] = mapped_column(
        SQLEnum(CareCircleStatus), nullable=False, default=CareCircleStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )