"""Seed realistic Aegis demo data directly into the configured database.

Run from the backend directory with:

    uv run python -m app.scripts.seed_demo_data

The script is intentionally idempotent: if the sentinel demo patient already
exists, no records are changed or added.
"""

import asyncio
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, select

from app.database import AsyncSessionLocal, engine
from app.models.care_circle import CareCircle, CareCircleStatus, PermissionScope
from app.models.entry import Entry, EntryType
from app.models.interaction_flag import InteractionFlag, InteractionSeverity
from app.models.medication import Medication
from app.models.user import User, UserRole
from app.services.auth import hash_password
from app.services.interaction_data import find_interaction
from app.services.rxnorm import get_rxcui


DEMO_PASSWORD = "DemoPass123"
SENTINEL_EMAIL = "demo.patient1@aegis.dev"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def create_medication_with_interactions(
    db,
    *,
    patient_id,
    entry_id,
    drug_name: str,
    dosage: str,
    frequency: str,
    start_date: date,
) -> tuple[Medication, list[InteractionFlag]]:
    """Mirror the medication route's RxNorm and interaction behavior."""
    rxcui = await get_rxcui(drug_name)
    if not rxcui:
        raise RuntimeError(f"RxNorm could not resolve {drug_name!r}; seed was rolled back")

    medication = Medication(
        entry_id=entry_id,
        patient_id=patient_id,
        drug_name=drug_name,
        rxcui=rxcui,
        dosage=dosage,
        frequency=frequency,
        start_date=start_date,
        end_date=None,
    )
    db.add(medication)
    await db.flush()

    existing_result = await db.execute(
        select(Medication).where(
            and_(
                Medication.patient_id == patient_id,
                Medication.id != medication.id,
                Medication.rxcui.is_not(None),
            )
        )
    )
    existing_medications = existing_result.scalars().all()
    new_flags: list[InteractionFlag] = []

    for other_medication in existing_medications:
        if not other_medication.is_active or not medication.is_active:
            continue

        interaction = find_interaction(rxcui, other_medication.rxcui)
        if not interaction:
            continue

        flag = InteractionFlag(
            patient_id=patient_id,
            medication_id_a=medication.id,
            medication_id_b=other_medication.id,
            severity=InteractionSeverity(interaction["severity"]),
            description=interaction["description"],
        )
        db.add(flag)
        new_flags.append(flag)

    await db.flush()
    return medication, new_flags


def add_user(*, name: str, email: str, role: UserRole, specialty: str | None = None) -> User:
    return User(
        name=name,
        email=email,
        password_hash=hash_password(DEMO_PASSWORD),
        role=role,
        specialty=specialty,
    )


def add_entry(
    *,
    patient_id,
    author_id,
    entry_type: EntryType,
    specialty_tag: str,
    title: str,
    content: str,
    days_ago: int,
) -> Entry:
    return Entry(
        patient_id=patient_id,
        author_id=author_id,
        entry_type=entry_type,
        specialty_tag=specialty_tag,
        title=title,
        content=content,
        created_at=utc_now() - timedelta(days=days_ago),
    )


def add_circle(*, patient_id, doctor_id, status: CareCircleStatus, days_ago: int) -> CareCircle:
    created_at = utc_now() - timedelta(days=days_ago)
    return CareCircle(
        patient_id=patient_id,
        doctor_id=doctor_id,
        permission_scope=PermissionScope.FULL,
        status=status,
        created_at=created_at,
        updated_at=created_at,
    )


async def seed_demo_data() -> None:
    async with AsyncSessionLocal() as db:
        existing_result = await db.execute(select(User).where(User.email == SENTINEL_EMAIL))
        if existing_result.scalar_one_or_none():
            print(f"Demo data already exists ({SENTINEL_EMAIL}); skipping seed.")
            return

        try:
            patient1 = add_user(
                name="Ananya Sharma",
                email="demo.patient1@aegis.dev",
                role=UserRole.PATIENT,
            )
            patient2 = add_user(
                name="Rohan Verma",
                email="demo.patient2@aegis.dev",
                role=UserRole.PATIENT,
            )
            doctor1 = add_user(
                name="Dr. Priya Nair",
                email="demo.doctor1@aegis.dev",
                role=UserRole.DOCTOR,
                specialty="Cardiology",
            )
            doctor2 = add_user(
                name="Dr. Arjun Mehta",
                email="demo.doctor2@aegis.dev",
                role=UserRole.DOCTOR,
                specialty="Endocrinology",
            )
            doctor3 = add_user(
                name="Dr. Kavita Rao",
                email="demo.doctor3@aegis.dev",
                role=UserRole.DOCTOR,
                specialty="Nephrology",
            )
            doctor4 = add_user(
                name="Dr. Sameer Iyer",
                email="demo.doctor4@aegis.dev",
                role=UserRole.DOCTOR,
                specialty="General Medicine",
            )
            caregiver = add_user(
                name="Meera Sharma",
                email="demo.caregiver1@aegis.dev",
                role=UserRole.CAREGIVER,
            )

            users = [patient1, patient2, doctor1, doctor2, doctor3, doctor4, caregiver]
            db.add_all(users)
            await db.flush()

            circles = [
                add_circle(patient_id=patient1.id, doctor_id=doctor1.id, status=CareCircleStatus.ACTIVE, days_ago=45),
                add_circle(patient_id=patient1.id, doctor_id=doctor2.id, status=CareCircleStatus.ACTIVE, days_ago=35),
                add_circle(patient_id=patient1.id, doctor_id=doctor3.id, status=CareCircleStatus.ACTIVE, days_ago=25),
                add_circle(patient_id=patient1.id, doctor_id=caregiver.id, status=CareCircleStatus.ACTIVE, days_ago=15),
                add_circle(patient_id=patient2.id, doctor_id=doctor4.id, status=CareCircleStatus.ACTIVE, days_ago=20),
                add_circle(patient_id=patient2.id, doctor_id=doctor1.id, status=CareCircleStatus.PENDING, days_ago=2),
            ]
            db.add_all(circles)
            await db.flush()

            warfarin_entry = add_entry(
                patient_id=patient1.id,
                author_id=doctor1.id,
                entry_type=EntryType.PRESCRIPTION,
                specialty_tag="Cardiology",
                title="Anticoagulation therapy",
                content="Continue anticoagulation for atrial fibrillation stroke-risk reduction.",
                days_ago=30,
            )
            ibuprofen_entry = add_entry(
                patient_id=patient1.id,
                author_id=doctor3.id,
                entry_type=EntryType.PRESCRIPTION,
                specialty_tag="Nephrology",
                title="Pain management review",
                content="Short-term pain management plan for musculoskeletal discomfort.",
                days_ago=5,
            )
            patient1_entries = [
                warfarin_entry,
                ibuprofen_entry,
                add_entry(
                    patient_id=patient1.id,
                    author_id=doctor1.id,
                    entry_type=EntryType.DIAGNOSIS,
                    specialty_tag="Cardiology",
                    title="Atrial fibrillation follow-up",
                    content="Paroxysmal atrial fibrillation remains stable; continue rhythm and anticoagulation monitoring.",
                    days_ago=32,
                ),
                add_entry(
                    patient_id=patient1.id,
                    author_id=doctor2.id,
                    entry_type=EntryType.NOTE,
                    specialty_tag="Endocrinology",
                    title="Care coordination note",
                    content="Reviewed shared medication list and coordinated follow-up between the specialty teams.",
                    days_ago=12,
                ),
                add_entry(
                    patient_id=patient1.id,
                    author_id=doctor3.id,
                    entry_type=EntryType.TEST_ORDER,
                    specialty_tag="Nephrology",
                    title="Routine renal panel",
                    content="Order a routine renal function panel before the next medication review.",
                    days_ago=3,
                ),
            ]

            patient2_entries = [
                add_entry(
                    patient_id=patient2.id,
                    author_id=doctor4.id,
                    entry_type=EntryType.DIAGNOSIS,
                    specialty_tag="General Medicine",
                    title="Essential hypertension",
                    content="Blood pressure is improving with lifestyle changes; continue home monitoring.",
                    days_ago=18,
                ),
                add_entry(
                    patient_id=patient2.id,
                    author_id=doctor4.id,
                    entry_type=EntryType.NOTE,
                    specialty_tag="General Medicine",
                    title="Primary care follow-up",
                    content="Reviewed preventive care plan and scheduled a routine follow-up visit.",
                    days_ago=7,
                ),
            ]

            all_entries = patient1_entries + patient2_entries
            db.add_all(all_entries)
            await db.flush()

            today = date.today()
            warfarin, warfarin_flags = await create_medication_with_interactions(
                db,
                patient_id=patient1.id,
                entry_id=warfarin_entry.id,
                drug_name="warfarin",
                dosage="5mg",
                frequency="once daily",
                start_date=today - timedelta(days=30),
            )
            ibuprofen, ibuprofen_flags = await create_medication_with_interactions(
                db,
                patient_id=patient1.id,
                entry_id=ibuprofen_entry.id,
                drug_name="ibuprofen",
                dosage="400mg",
                frequency="twice daily",
                start_date=today - timedelta(days=5),
            )

            flags = warfarin_flags + ibuprofen_flags
            if not any(
                {flag.medication_id_a, flag.medication_id_b} == {warfarin.id, ibuprofen.id}
                for flag in flags
            ):
                raise RuntimeError(
                    "Warfarin/Ibuprofen interaction was not detected; seed was rolled back"
                )

            await db.commit()

            print("Demo data seeded successfully.")
            print(
                f"Created: {len(users)} users, {len(circles)} care circles, "
                f"{len(all_entries)} entries, 2 medications, {len(flags)} interaction flags."
            )
            print("\nDemo login credentials")
            print("-" * 72)
            print(f"{'Role':<12} {'Name':<22} {'Email':<36} Password")
            print("-" * 72)
            print(f"{'patient':<12} {'Ananya Sharma':<22} {'demo.patient1@aegis.dev':<36} {DEMO_PASSWORD}")
            print(f"{'patient':<12} {'Rohan Verma':<22} {'demo.patient2@aegis.dev':<36} {DEMO_PASSWORD}")
            print(f"{'doctor':<12} {'Dr. Priya Nair':<22} {'demo.doctor1@aegis.dev':<36} {DEMO_PASSWORD}")
            print(f"{'doctor':<12} {'Dr. Arjun Mehta':<22} {'demo.doctor2@aegis.dev':<36} {DEMO_PASSWORD}")
            print(f"{'doctor':<12} {'Dr. Kavita Rao':<22} {'demo.doctor3@aegis.dev':<36} {DEMO_PASSWORD}")
            print(f"{'doctor':<12} {'Dr. Sameer Iyer':<22} {'demo.doctor4@aegis.dev':<36} {DEMO_PASSWORD}")
            print(f"{'caregiver':<12} {'Meera Sharma':<22} {'demo.caregiver1@aegis.dev':<36} {DEMO_PASSWORD}")
            print("-" * 72)
        except Exception:
            await db.rollback()
            raise


async def main() -> None:
    try:
        await seed_demo_data()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
