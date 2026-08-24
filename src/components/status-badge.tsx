import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status = "Unknown" }: { status?: string }) {
  const variant = ["Completed", "CertificateIssued", "Active"].includes(status)
    ? "success"
    : ["Overdue", "Restricted", "Revoked", "Expired", "Rejected"].includes(status)
      ? "destructive"
      : ["ManagerVerification", "Pending", "Expiring"].includes(status)
        ? "warning"
        : "secondary";
  const label = status.replace(/([a-z])([A-Z])/g, "$1 $2");
  return <Badge variant={variant}>{label}</Badge>;
}
