import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.entry import Entry, EntryType
from app.models.medication import Medication
from app.models.interaction_flag import InteractionFlag, InteractionSeverity
from app.schemas.medication import MedicationCreate, MedicationResponse, InteractionFlagResponse
from app.middleware.care_circle_permission import require_patient_access
from app.services.rxnorm import get_rxcui
from app.services.interaction_data import find_interaction

router = APIRouter(prefix="/patients/{patient_id}/entries/{entry_id}/medications", tags=["medications"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_medication(
    patient_id: uuid.UUID,
    entry_id: uuid.UUID,
    payload: MedicationCreate,
    current_user: User = Depends(require_patient_access()),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can add medications")

    result = await db.execute(
        select(Entry).where(
            and_(
                Entry.id == entry_id,
                Entry.patient_id == patient_id,
                Entry.entry_type == EntryType.PRESCRIPTION,
            )
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(
            status_code=404, detail="Prescription entry not found for this patient"
        )

    rxcui = await get_rxcui(payload.drug_name)

    medication = Medication(
        entry_id=entry_id,
        patient_id=patient_id,
        drug_name=payload.drug_name,
        rxcui=rxcui,
        dosage=payload.dosage,
        frequency=payload.frequency,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(medication)
    await db.commit()
    await db.refresh(medication)

    new_flags = []

    if rxcui:
        existing_meds_result = await db.execute(
            select(Medication).where(
                and_(
                    Medication.patient_id == patient_id,
                    Medication.id != medication.id,
                    Medication.rxcui.is_not(None),
                )
            )
        )
        existing_meds = existing_meds_result.scalars().all()

        for other_med in existing_meds:
            if not other_med.is_active or not medication.is_active:
                continue  

            interaction = find_interaction(rxcui, other_med.rxcui)
            if interaction:
                flag = InteractionFlag(
                    patient_id=patient_id,
                    medication_id_a=medication.id,
                    medication_id_b=other_med.id,
                    severity=InteractionSeverity(interaction["severity"]),
                    description=interaction["description"],
                )
                db.add(flag)
                new_flags.append(flag)

        if new_flags:
            await db.commit()
            for flag in new_flags:
                await db.refresh(flag)

    return {
        "medication": MedicationResponse.model_validate(medication),
        "new_interaction_flags": [InteractionFlagResponse.model_validate(f) for f in new_flags],
    }