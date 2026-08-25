import { BadgeCheck, Check, Clock3 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { recordId, sendLifecycleMessage, verifyAndIssue } from "./complianceApi";
import type { Completion } from "./complianceApi";
import { useComplianceData, useRefreshCompliance } from "./useComplianceData";
import { useCurrentUser, userDisplayName } from "../profile/useCurrentUser";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { StatusPill } from "../../shared/ui/StatusPill";
import { useT } from "../../lib/i18n/LocalizationProvider";

export function VerificationsPage() {
  const { language, t } = useT();
  const { assignments, completions, courses, settings } = useComplianceData();
  const me = useCurrentUser();
  const refresh = useRefreshCompliance();
  const pending = (completions.data ?? []).filter((item) => item.status === "Completed");
  const verify = useMutation({ mutationFn: async (completion: Completion) => {
    const assignment = (assignments.data ?? []).find((item) => item.ItemId === completion.assignmentId || item.itemId === completion.assignmentId);
    if (!assignment) throw new Error(t("verifications.assignmentMissing"));
    const course = (courses.data ?? []).find((item) => recordId(item) === assignment.courseId);
    await verifyAndIssue({ assignment, completion, course, graceDays: Number(settings.data?.[0]?.gracePeriodDays ?? 7), verifier: userDisplayName(me.data?.data) || t("verifications.manager") });
    await sendLifecycleMessage("certificate", { courseTitle: assignment.courseTitle, email: assignment.userEmail, userId: assignment.userId });
  }, onSuccess: () => void refresh() });
  return <section>
    <PageHeader title={t("verifications.title")} subtitle={t("verifications.subtitle")} actions={<StatusPill tone={pending.length ? "warn" : "good"}>{`${pending.length} ${t("verifications.pending")}`}</StatusPill>} />
    {pending.length ? <div className="timeline-list">{pending.map((completion) => {
      const assignment = (assignments.data ?? []).find((item) => recordId(item) === completion.assignmentId);
      return <article className="assignment-row" key={recordId(completion)}><span className="assignment-icon"><Clock3 size={20} /></span><div className="assignment-main"><strong>{assignment?.courseTitle ?? t("verifications.trainingCompletion")}</strong><span>{assignment?.userName || assignment?.userEmail} · {t("verifications.completed")} {completion.completedAt ? new Date(completion.completedAt).toLocaleDateString(language) : t("verifications.recently")}</span></div><button className="primary-button" disabled={verify.isPending} onClick={() => verify.mutate(completion)}><Check size={16} /> {t("verifications.verify")}</button></article>;
    })}</div> : <EmptyState icon={<BadgeCheck size={28} />} title={t("verifications.empty")} description={t("verifications.emptyDescription")} />}
  </section>;
}
