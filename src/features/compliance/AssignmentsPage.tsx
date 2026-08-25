import { CheckCircle2, ClipboardList, Play, Plus, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createAssignment, finishAssignment, recordId, sendLifecycleMessage, startAssignment } from "./complianceApi";
import type { CourseAssignment } from "./complianceApi";
import { statusTone } from "./compliance-domain";
import { useComplianceData, useRefreshCompliance } from "./useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { StatusPill } from "../../shared/ui/StatusPill";
import { DataTable } from "../../shared/ui/DataTable";
import type { Column } from "../../shared/ui/DataTable";
import { Modal } from "../../shared/ui/Modal";
import { SelectMenu } from "../../shared/ui/SelectMenu";
import { CollectionFilters } from "../../shared/ui/CollectionFilters";

const EMPTY_FORM = { courseId: "", userId: "", userName: "", userEmail: "", role: "employee", department: "" };
const ROLE_OPTIONS = [
  { label: "Employee", value: "employee" },
  { label: "Manager", value: "manager" },
  { label: "HR Admin", value: "hr-admin" },
  { label: "Compliance Officer", value: "compliance-officer" },
  { label: "Trainer", value: "trainer" }
];
const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Assigned", value: "Assigned" },
  { label: "In progress", value: "In Progress" },
  { label: "Completed", value: "Completed" },
  { label: "Manager verification", value: "Manager Verification" },
  { label: "Certificate issued", value: "Certificate Issued" }
];
const WORKFLOW = ["Assigned", "In Progress", "Completed", "Manager Verification", "Certificate Issued"];

export function AssignmentsPage() {
  const { assignments, completions, courses, settings } = useComplianceData();
  const refresh = useRefreshCompliance();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const course = useMemo(() => (courses.data ?? []).find((item) => recordId(item) === form.courseId), [courses.data, form.courseId]);
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (assignments.data ?? []).filter((assignment) => {
      const matchesSearch = `${assignment.courseTitle} ${assignment.userName} ${assignment.userEmail} ${assignment.role} ${assignment.department}`.toLowerCase().includes(query);
      return matchesSearch && (status === "all" || assignment.status === status);
    });
  }, [assignments.data, search, status]);

  const create = useMutation({
    mutationFn: async () => {
      await createAssignment({ ...form, assignedAt: new Date().toISOString(), assignedBy: "HR Admin", autoAssigned: false, courseTitle: course?.title, dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), status: "Assigned" });
      await sendLifecycleMessage("assigned", { courseTitle: course?.title, email: form.userEmail, userId: form.userId });
    },
    onSuccess: () => {
      setShowForm(false);
      setForm(EMPTY_FORM);
      void refresh();
    }
  });
  const advance = useMutation({
    mutationFn: async (assignment: CourseAssignment) => {
      if (assignment.status === "Assigned") await startAssignment(assignment);
      else if (assignment.status === "In Progress") {
        const completion = (completions.data ?? []).find((item) => item.assignmentId === recordId(assignment));
        await finishAssignment(assignment, completion, settings.data?.[0]?.managerVerificationRequired ?? true);
        await sendLifecycleMessage("completed", { courseTitle: assignment.courseTitle, email: assignment.userEmail, userId: assignment.userId });
      }
    },
    onSuccess: () => void refresh()
  });

  const columns: Column<CourseAssignment>[] = [
    { key: "learner", header: "Learner", render: (assignment) => <div className="table-primary-cell"><span className="assignment-icon table-cell-icon"><UserRound size={18} /></span><span><strong>{assignment.userName || "Unnamed learner"}</strong><small>{assignment.userEmail}</small></span></div> },
    { key: "course", header: "Course", render: (assignment) => <div className="table-stacked-cell"><strong>{assignment.courseTitle || "Untitled course"}</strong><small>{assignment.department || "All departments"}</small></div> },
    { key: "role", header: "Role", render: (assignment) => <span className="chip">{roleLabel(assignment.role)}</span> },
    { key: "progress", header: "Progress", render: (assignment) => <div className="table-progress"><span><StatusPill tone={statusTone(assignment.status)}>{assignment.status ?? "Assigned"}</StatusPill><small>{progressPercent(assignment.status)}%</small></span><div className="workflow-track"><span className="workflow-fill" style={{ width: `${progressPercent(assignment.status)}%` }} /></div></div> },
    { key: "due", header: "Due date", render: (assignment) => <div className="table-stacked-cell"><strong>{formatDate(assignment.dueAt)}</strong><small>{assignment.autoAssigned ? "Auto-assigned" : "Manual assignment"}</small></div> },
    { key: "actions", header: <span className="sr-only">Actions</span>, render: (assignment) => <div className="row-actions">{assignment.status === "Certificate Issued" ? <span className="completed-mark"><CheckCircle2 size={16} /> Complete</span> : null}{assignment.status === "Assigned" || assignment.status === "In Progress" ? <button className="icon-button table-action-button" disabled={advance.isPending} onClick={() => advance.mutate(assignment)}><Play size={15} /> {assignment.status === "Assigned" ? "Start" : "Complete"}</button> : null}</div> }
  ];

  function closeForm() {
    if (!create.isPending) setShowForm(false);
  }

  return <section>
    <PageHeader title="Training assignments" subtitle="Track every learner from assignment through certification in one workspace." actions={<button className="primary-button" onClick={() => setShowForm(true)}><Plus size={16} /> Assign course</button>} />

    <CollectionFilters
      onClear={() => { setSearch(""); setStatus("all"); }}
      onSearchChange={setSearch}
      onStatusChange={setStatus}
      resultCount={rows.length}
      resultNoun="assignment"
      search={search}
      searchPlaceholder="Search learner, course, role, or department"
      statusOptions={STATUS_OPTIONS}
      statusValue={status}
    />

    {rows.length ? <DataTable columns={columns} rows={rows} getRowId={(assignment) => recordId(assignment)} paginated /> : <EmptyState icon={<ClipboardList size={28} />} title={search || status !== "all" ? "No matching assignments" : "No assignments"} description={search || status !== "all" ? "Adjust the search or status filter to see more results." : "Assign a course manually or let role-based assignment create one."} />}

    {showForm ? <Modal onClose={closeForm} title="Assign a course">
      <p>Choose a course and connect it to the employee’s Blocks account.</p>
      <form className="form-grid modal-form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <div className="form-span"><SelectMenu label="Course" options={(courses.data ?? []).map((item) => ({ label: `${item.title}${item.code ? ` · ${item.code}` : ""}`, value: recordId(item) }))} placeholder="Select a course" value={form.courseId} onChange={(courseId) => setForm({ ...form, courseId })} /></div>
        <label className="form-field"><span>Employee name</span><input autoFocus required placeholder="Full name" value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} /></label>
        <label className="form-field"><span>Employee email</span><input required type="email" placeholder="name@company.com" value={form.userEmail} onChange={(event) => setForm({ ...form, userEmail: event.target.value })} /></label>
        <label className="form-field"><span>Blocks user ID</span><input required placeholder="User identifier" value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} /></label>
        <SelectMenu label="Role" options={ROLE_OPTIONS} value={form.role} onChange={(role) => setForm({ ...form, role })} />
        <label className="form-field form-span"><span>Department</span><input placeholder="e.g. Operations" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
        {create.isError ? <div className="form-error form-span">{errorMessage(create.error)}</div> : null}
        <div className="form-actions"><button className="icon-button" type="button" onClick={closeForm}>Cancel</button><button className="primary-button" disabled={!form.courseId || !form.userName.trim() || !form.userEmail.trim() || !form.userId.trim() || create.isPending} type="submit">{create.isPending ? "Assigning…" : "Create assignment"}</button></div>
      </form>
    </Modal> : null}
  </section>;
}

function roleLabel(role?: string) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role ?? "Employee";
}

function progressPercent(status?: string) {
  const step = WORKFLOW.indexOf(status ?? "Assigned");
  return Math.max(10, (step + 1) * 20);
}

function formatDate(value?: string) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The assignment could not be created. Please try again.";
}
