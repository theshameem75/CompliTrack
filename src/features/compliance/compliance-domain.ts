import type { Certificate, CourseAssignment } from "./complianceApi";

export const WORKFLOW = ["Assigned", "In Progress", "Completed", "Manager Verification", "Certificate Issued"] as const;
export type WorkflowStatus = (typeof WORKFLOW)[number];

export function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function daysUntil(value?: string): number | undefined {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return undefined;
  return Math.ceil((time - Date.now()) / 86_400_000);
}

export function certificateState(certificate: Certificate): "active" | "due" | "grace" | "restricted" | "revoked" {
  if (certificate.status === "Revoked") return "revoked";
  const expiry = daysUntil(certificate.expiresAt);
  if (expiry === undefined || expiry > 60) return "active";
  if (expiry >= 0) return "due";
  const grace = daysUntil(certificate.graceEndsAt);
  return grace !== undefined && grace >= 0 ? "grace" : "restricted";
}

export function complianceScore(assignments: CourseAssignment[]): number {
  if (!assignments.length) return 100;
  const compliant = assignments.filter((item) => item.status === "Certificate Issued").length;
  return Math.round((compliant / assignments.length) * 100);
}

export function statusTone(status?: string): "good" | "neutral" | "warn" {
  if (status === "Certificate Issued" || status === "Active") return "good";
  if (status === "Assigned" || status === "In Progress") return "neutral";
  return "warn";
}
