export interface AuditLogEntry {
  id: string;
  actor_id: string;
  patient_id: string;
  action: string;
  entry_id: string | null;
  metadata_json: Record<string, unknown> | null;
  timestamp: string;
}
