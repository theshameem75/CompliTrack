import { AlertTriangle, Award, CheckCircle2, ClipboardCheck, ShieldCheck, TrendingUp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { complianceScore, certificateState } from "../compliance/compliance-domain";
import { useComplianceData } from "../compliance/useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusPill } from "../../shared/ui/StatusPill";

export function DashboardPage() {
  const { assignments, certificates, completions, courses } = useComplianceData();
  const assignmentRows = assignments.data ?? [];
  const certificateRows = certificates.data ?? [];
  const pending = (completions.data ?? []).filter((item) => item.status === "Completed").length;
  const restricted = certificateRows.filter((item) => certificateState(item) === "restricted").length;
  const due = certificateRows.filter((item) => ["due", "grace"].includes(certificateState(item))).length;
  const score = complianceScore(assignmentRows);

  return <section>
    <PageHeader title="Compliance command center" subtitle="Training readiness, verification workload, renewals, and access risk." actions={<StatusPill tone={score >= 90 ? "good" : "warn"}>{`${score}% compliant`}</StatusPill>} />
    <div className="hero-panel"><div><span className="eyebrow">Organization score</span><strong>{score}%</strong><p>{assignmentRows.length} mandatory assignments tracked across {(courses.data ?? []).length} active courses.</p></div><div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as CSSProperties}><span>{score}</span></div></div>
    <div className="metrics">
      <Metric icon={<ClipboardCheck size={18} />} label="Assignments" value={assignmentRows.length} detail={`${assignmentRows.filter((item) => item.status === "In Progress").length} in progress`} />
      <Metric icon={<CheckCircle2 size={18} />} label="Pending verification" value={pending} detail="Manager action required" warning={pending > 0} />
      <Metric icon={<Award size={18} />} label="Expiring soon" value={due} detail="60 / 30 / 7 day window" warning={due > 0} />
      <Metric icon={<AlertTriangle size={18} />} label="Restricted" value={restricted} detail="Grace period elapsed" warning={restricted > 0} />
    </div>
    <div className="grid two-col"><div className="panel"><div className="panel-title"><TrendingUp size={17} /> Workflow health</div>{["Assigned", "In Progress", "Manager Verification", "Certificate Issued"].map((status) => { const count = assignmentRows.filter((item) => item.status === status).length; return <div className="bar-row" key={status}><span>{status}</span><div className="mini-bar"><i style={{ width: `${assignmentRows.length ? Math.max(4, count / assignmentRows.length * 100) : 0}%` }} /></div><strong>{count}</strong></div>; })}</div>
      <div className="panel"><div className="panel-title"><ShieldCheck size={17} /> Policy status</div><ul className="policy-list"><li><CheckCircle2 size={17} /><span><strong>Role-based auto-assignment</strong><small>Targets stored on each course</small></span></li><li><CheckCircle2 size={17} /><span><strong>Grace period</strong><small>Restriction begins after the configured buffer</small></span></li><li><CheckCircle2 size={17} /><span><strong>Manager verification</strong><small>Required before certificate issuance</small></span></li></ul></div></div>
  </section>;
}

function Metric({ detail, icon, label, value, warning = false }: { detail: string; icon: ReactNode; label: string; value: number; warning?: boolean }) {
  return <div className={`metric ${warning ? "metric-warning" : ""}`}><span className="metric-label">{icon}{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
