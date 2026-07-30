import uuid
from datetime import date, datetime, timezone

from sqlalchemy import ForeignKey, DateTime, Date, String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("entries.id"), nullable=False
    )

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    drug_name: Mapped[str] = mapped_column(String(255), nullable=False)

    rxcui: Mapped[str | None] = mapped_column(String(20), nullable=True)

    dosage: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "500mg"
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "twice daily"

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # null = ongoing

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    @property
    def is_active(self) -> bool:
        today = date.today()
        if self.end_date is None:
            return self.start_date <= today
        return self.start_date <= today <= self.end_date