import { AlertTriangle, Award, CheckCircle2, ClipboardCheck, ShieldCheck, TrendingUp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { complianceScore, certificateState } from "../compliance/compliance-domain";
import { useComplianceData } from "../compliance/useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusPill } from "../../shared/ui/StatusPill";
import { useT } from "../../lib/i18n/LocalizationProvider";

export function DashboardPage() {
  const { t } = useT();
  const { assignments, certificates, completions, courses } = useComplianceData();
  const assignmentRows = assignments.data ?? [];
  const certificateRows = certificates.data ?? [];
  const pending = (completions.data ?? []).filter((item) => item.status === "Completed").length;
  const restricted = certificateRows.filter((item) => certificateState(item) === "restricted").length;
  const due = certificateRows.filter((item) => ["due", "grace"].includes(certificateState(item))).length;
  const score = complianceScore(assignmentRows);

  return <section>
    <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} actions={<StatusPill tone={score >= 90 ? "good" : "warn"}>{`${score}% ${t("dashboard.compliant")}`}</StatusPill>} />
    <div className="hero-panel"><div><span className="eyebrow">{t("dashboard.organizationScore")}</span><strong>{score}%</strong><p>{assignmentRows.length} {t("dashboard.assignmentSummary")} {(courses.data ?? []).length} {t("dashboard.activeCourses")}</p></div><div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as CSSProperties}><span>{score}</span></div></div>
    <div className="metrics">
      <Metric icon={<ClipboardCheck size={18} />} label={t("dashboard.assignments")} value={assignmentRows.length} detail={`${assignmentRows.filter((item) => item.status === "In Progress").length} ${t("dashboard.inProgress")}`} />
      <Metric icon={<CheckCircle2 size={18} />} label={t("dashboard.pending")} value={pending} detail={t("dashboard.managerAction")} warning={pending > 0} />
      <Metric icon={<Award size={18} />} label={t("dashboard.expiring")} value={due} detail={t("dashboard.expiryWindow")} warning={due > 0} />
      <Metric icon={<AlertTriangle size={18} />} label={t("dashboard.restricted")} value={restricted} detail={t("dashboard.graceElapsed")} warning={restricted > 0} />
    </div>
    <div className="grid two-col"><div className="panel"><div className="panel-title"><TrendingUp size={17} /> {t("dashboard.workflow")}</div>{[["Assigned", "status.assigned"], ["In Progress", "status.inProgress"], ["Manager Verification", "status.managerVerification"], ["Certificate Issued", "status.certificateIssued"]].map(([status, key]) => { const count = assignmentRows.filter((item) => item.status === status).length; return <div className="bar-row" key={status}><span>{t(key as "status.assigned")}</span><div className="mini-bar"><i style={{ width: `${assignmentRows.length ? Math.max(4, count / assignmentRows.length * 100) : 0}%` }} /></div><strong>{count}</strong></div>; })}</div>
      <div className="panel"><div className="panel-title"><ShieldCheck size={17} /> {t("dashboard.policy")}</div><ul className="policy-list"><li><CheckCircle2 size={17} /><span><strong>{t("dashboard.autoAssign")}</strong><small>{t("dashboard.autoAssignDetail")}</small></span></li><li><CheckCircle2 size={17} /><span><strong>{t("dashboard.grace")}</strong><small>{t("dashboard.graceDetail")}</small></span></li><li><CheckCircle2 size={17} /><span><strong>{t("dashboard.verification")}</strong><small>{t("dashboard.verificationDetail")}</small></span></li></ul></div></div>
  </section>;
}

function Metric({ detail, icon, label, value, warning = false }: { detail: string; icon: ReactNode; label: string; value: number; warning?: boolean }) {
  return <div className={`metric ${warning ? "metric-warning" : ""}`}><span className="metric-label">{icon}{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
