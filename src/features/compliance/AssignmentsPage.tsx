import { CheckCircle2, ClipboardList, Play, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createAssignment, finishAssignment, recordId, sendLifecycleMessage, startAssignment } from "./complianceApi";
import type { CourseAssignment } from "./complianceApi";
import { statusTone } from "./compliance-domain";
import { useComplianceData, useRefreshCompliance } from "./useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { StatusPill } from "../../shared/ui/StatusPill";

export function AssignmentsPage() {
  const { assignments, completions, courses, settings } = useComplianceData();
  const refresh = useRefreshCompliance();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ courseId: "", userId: "", userName: "", userEmail: "", role: "employee", department: "" });
  const course = useMemo(() => (courses.data ?? []).find((item) => recordId(item) === form.courseId), [courses.data, form.courseId]);
  const create = useMutation({ mutationFn: async () => {
    await createAssignment({ ...form, assignedAt: new Date().toISOString(), assignedBy: "HR Admin", autoAssigned: false, courseTitle: course?.title, dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), status: "Assigned" });
    await sendLifecycleMessage("assigned", { courseTitle: course?.title, email: form.userEmail, userId: form.userId });
  }, onSuccess: () => { setShowForm(false); void refresh(); } });
  const advance = useMutation({ mutationFn: async (assignment: CourseAssignment) => {
    if (assignment.status === "Assigned") await startAssignment(assignment);
    else if (assignment.status === "In Progress") {
      const completion = (completions.data ?? []).find((item) => item.assignmentId === recordId(assignment));
      await finishAssignment(assignment, completion, settings.data?.[0]?.managerVerificationRequired ?? true);
      await sendLifecycleMessage("completed", { courseTitle: assignment.courseTitle, email: assignment.userEmail, userId: assignment.userId });
    }
  }, onSuccess: () => void refresh() });

  return <section>
    <PageHeader title="Training assignments" subtitle="Follow every learner through assignment, completion, verification, and certification." actions={<button className="primary-button" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> Assign course</button>} />
    {showForm ? <div className="panel form-grid">
      <label className="form-field"><span>Course</span><select value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}><option value="">Select course</option>{(courses.data ?? []).map((item) => <option key={recordId(item)} value={recordId(item)}>{item.title}</option>)}</select></label>
      <label className="form-field"><span>Employee name</span><input value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} /></label>
      <label className="form-field"><span>Employee email</span><input type="email" value={form.userEmail} onChange={(event) => setForm({ ...form, userEmail: event.target.value })} /></label>
      <label className="form-field"><span>Blocks user ID</span><input value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} /></label>
      <label className="form-field"><span>Role</span><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} /></label>
      <label className="form-field"><span>Department</span><input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
      <div className="form-actions"><button className="icon-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={!form.courseId || !form.userEmail || create.isPending} onClick={() => create.mutate()}>Create assignment</button></div>
    </div> : null}
    {(assignments.data ?? []).length ? <div className="timeline-list">{(assignments.data ?? []).map((assignment) => <article className="assignment-row" key={recordId(assignment)}>
      <span className="assignment-icon">{assignment.status === "Certificate Issued" ? <CheckCircle2 size={20} /> : <ClipboardList size={20} />}</span>
      <div className="assignment-main"><strong>{assignment.courseTitle}</strong><span>{assignment.userName || assignment.userEmail} · {assignment.role}</span><div className="workflow-track"><span className="workflow-fill" style={{ width: `${Math.max(8, (["Assigned", "In Progress", "Completed", "Manager Verification", "Certificate Issued"].indexOf(assignment.status ?? "Assigned") + 1) * 20)}%` }} /></div></div>
      <div className="assignment-actions"><StatusPill tone={statusTone(assignment.status)}>{assignment.status ?? "Assigned"}</StatusPill>{assignment.status === "Assigned" || assignment.status === "In Progress" ? <button className="icon-button" onClick={() => advance.mutate(assignment)}><Play size={15} /> {assignment.status === "Assigned" ? "Start" : "Complete"}</button> : null}</div>
    </article>)}</div> : <EmptyState icon={<ClipboardList size={28} />} title="No assignments" description="Assign a course manually or let role-based assignment create one." />}
  </section>;
}
