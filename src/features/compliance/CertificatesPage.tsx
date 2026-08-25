import { Award, BellRing, Download, ShieldAlert } from "lucide-react";
import { certificateState, daysUntil } from "./compliance-domain";
import { recordId } from "./complianceApi";
import { useComplianceData } from "./useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { StatusPill } from "../../shared/ui/StatusPill";
import { useT } from "../../lib/i18n/LocalizationProvider";

export function CertificatesPage() {
  const { language, t } = useT();
  const { certificates } = useComplianceData();
  const rows = certificates.data ?? [];
  return <section>
    <PageHeader title={t("certificates.title")} subtitle={t("certificates.subtitle")} actions={<button className="icon-button" onClick={() => window.print()}><Download size={16} /> {t("certificates.export")}</button>} />
    {rows.length ? <div className="card-grid">{rows.map((certificate) => { const state = certificateState(certificate); const remaining = daysUntil(certificate.expiresAt); return <article className="certificate-card" key={recordId(certificate)}>
      <div className="certificate-seal"><Award size={24} /></div><div><span className="eyebrow">{certificate.certificateNumber}</span><h3>{certificate.courseTitle}</h3><p>{t("certificates.issuedTo")} <strong>{certificate.userName || certificate.userEmail}</strong></p></div>
      <div className="certificate-dates"><span>{t("certificates.issued")} {certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString(language) : "—"}</span><span>{t("certificates.expires")} {certificate.expiresAt ? new Date(certificate.expiresAt).toLocaleDateString(language) : "—"}</span></div>
      <div className="certificate-footer"><StatusPill tone={state === "active" ? "good" : state === "due" || state === "grace" ? "warn" : "neutral"}>{t(`certificates.${state}` as "certificates.active")}</StatusPill><span className="muted">{state === "restricted" ? <><ShieldAlert size={14} /> {t("certificates.accessRestricted")}</> : <><BellRing size={14} /> {remaining ?? "—"} {t("certificates.days")}</>}</span></div>
    </article>; })}</div> : <EmptyState icon={<Award size={28} />} title={t("certificates.empty")} description={t("certificates.emptyDescription")} />}
  </section>;
}
