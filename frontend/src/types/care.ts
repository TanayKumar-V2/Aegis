export type PermissionScope = "full" | "notes_only" | "prescriptions_only";
export type CareCircleStatus = "pending" | "active" | "revoked";

export interface CareCircle {
  id: string;
  patient_id: string;
  doctor_id: string;
  permission_scope: PermissionScope;
  status: CareCircleStatus;
  created_at: string;
}

export interface DoctorPatient {
  circle_id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  permission_scope: PermissionScope;
  status: CareCircleStatus;
  created_at: string;
}

export interface PatientCareCircle {
  circle_id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_email: string;
  doctor_specialty: string | null;
  permission_scope: PermissionScope;
  status: CareCircleStatus;
  created_at: string;
}
