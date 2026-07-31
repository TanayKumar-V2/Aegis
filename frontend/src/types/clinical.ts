export type EntryType = "note" | "prescription" | "diagnosis" | "test_order";
export type FlagSeverity = "mild" | "moderate" | "severe";

export interface ClinicalEntry {
  id: string;
  patient_id: string;
  author_id: string;
  entry_type: EntryType;
  specialty_tag: string;
  title: string;
  content: string;
  created_at: string;
}

export interface InteractionFlag {
  id: string;
  patient_id: string;
  medication_id_a: string;
  medication_id_b: string;
  severity: FlagSeverity;
  description: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  flagged_at: string;
}

export interface MedicationResponse {
  id: string;
  entry_id: string;
  patient_id: string;
  drug_name: string;
  rxcui: string | null;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface MedicationCreateResponse {
  medication: MedicationResponse;
  new_interaction_flags: InteractionFlag[];
}
