import { Award, BellRing, Download, ShieldAlert } from "lucide-react";
import { certificateState, daysUntil } from "./compliance-domain";
import { recordId } from "./complianceApi";
import { useComplianceData } from "./useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { StatusPill } from "../../shared/ui/StatusPill";

export function CertificatesPage() {
  const { certificates } = useComplianceData();
  const rows = certificates.data ?? [];
  return <section>
    <PageHeader title="Certificates" subtitle="Expiry, grace-period, renewal, and restriction status in one place." actions={<button className="icon-button" onClick={() => window.print()}><Download size={16} /> Export / PDF</button>} />
    {rows.length ? <div className="card-grid">{rows.map((certificate) => { const state = certificateState(certificate); const remaining = daysUntil(certificate.expiresAt); return <article className="certificate-card" key={recordId(certificate)}>
      <div className="certificate-seal"><Award size={24} /></div><div><span className="eyebrow">{certificate.certificateNumber}</span><h3>{certificate.courseTitle}</h3><p>Issued to <strong>{certificate.userName || certificate.userEmail}</strong></p></div>
      <div className="certificate-dates"><span>Issued {certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString() : "—"}</span><span>Expires {certificate.expiresAt ? new Date(certificate.expiresAt).toLocaleDateString() : "—"}</span></div>
      <div className="certificate-footer"><StatusPill tone={state === "active" ? "good" : state === "due" || state === "grace" ? "warn" : "neutral"}>{state}</StatusPill><span className="muted">{state === "restricted" ? <><ShieldAlert size={14} /> Access restricted</> : <><BellRing size={14} /> {remaining ?? "—"} days</>}</span></div>
    </article>; })}</div> : <EmptyState icon={<Award size={28} />} title="No certificates issued" description="Certificates appear after manager verification completes." />}
  </section>;
}
