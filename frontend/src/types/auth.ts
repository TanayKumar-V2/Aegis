export type UserRole = "patient" | "doctor" | "caregiver";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialty: string | null;
  created_at: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  specialty?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}