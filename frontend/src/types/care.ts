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
