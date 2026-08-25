import { BadgeCheck, Check, Clock3 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { recordId, sendLifecycleMessage, verifyAndIssue } from "./complianceApi";
import type { Completion } from "./complianceApi";
import { useComplianceData, useRefreshCompliance } from "./useComplianceData";
import { useCurrentUser, userDisplayName } from "../profile/useCurrentUser";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { StatusPill } from "../../shared/ui/StatusPill";

export function VerificationsPage() {
  const { assignments, completions, courses, settings } = useComplianceData();
  const me = useCurrentUser();
  const refresh = useRefreshCompliance();
  const pending = (completions.data ?? []).filter((item) => item.status === "Completed");
  const verify = useMutation({ mutationFn: async (completion: Completion) => {
    const assignment = (assignments.data ?? []).find((item) => item.ItemId === completion.assignmentId || item.itemId === completion.assignmentId);
    if (!assignment) throw new Error("Assignment not found for completion.");
    const course = (courses.data ?? []).find((item) => recordId(item) === assignment.courseId);
    await verifyAndIssue({ assignment, completion, course, graceDays: Number(settings.data?.[0]?.gracePeriodDays ?? 7), verifier: userDisplayName(me.data?.data) || "Manager" });
    await sendLifecycleMessage("certificate", { courseTitle: assignment.courseTitle, email: assignment.userEmail, userId: assignment.userId });
  }, onSuccess: () => void refresh() });
  return <section>
    <PageHeader title="Manager verification" subtitle="Review completed training before certificates are issued." actions={<StatusPill tone={pending.length ? "warn" : "good"}>{`${pending.length} pending`}</StatusPill>} />
    {pending.length ? <div className="timeline-list">{pending.map((completion) => {
      const assignment = (assignments.data ?? []).find((item) => recordId(item) === completion.assignmentId);
      return <article className="assignment-row" key={recordId(completion)}><span className="assignment-icon"><Clock3 size={20} /></span><div className="assignment-main"><strong>{assignment?.courseTitle ?? "Training completion"}</strong><span>{assignment?.userName || assignment?.userEmail} · Completed {completion.completedAt ? new Date(completion.completedAt).toLocaleDateString() : "recently"}</span></div><button className="primary-button" disabled={verify.isPending} onClick={() => verify.mutate(completion)}><Check size={16} /> Verify & issue</button></article>;
    })}</div> : <EmptyState icon={<BadgeCheck size={28} />} title="All caught up" description="There are no training completions waiting for manager verification." />}
  </section>;
}
