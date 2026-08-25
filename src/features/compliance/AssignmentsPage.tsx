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
import { useT } from "../../lib/i18n/LocalizationProvider";

const EMPTY_FORM = { courseId: "", userId: "", userName: "", userEmail: "", role: "employee", department: "" };
const WORKFLOW = ["Assigned", "In Progress", "Completed", "Manager Verification", "Certificate Issued"];

export function AssignmentsPage() {
  const { assignments, completions, courses, settings } = useComplianceData();
  const { language, t } = useT();
  const refresh = useRefreshCompliance();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const roleOptions = [
    { label: t("role.employee"), value: "employee" },
    { label: t("role.manager"), value: "manager" },
    { label: t("role.hrAdmin"), value: "hr-admin" },
    { label: t("role.complianceOfficer"), value: "compliance-officer" },
    { label: t("role.trainer"), value: "trainer" }
  ];
  const statusOptions = [
    { label: t("status.all"), value: "all" },
    { label: t("status.assigned"), value: "Assigned" },
    { label: t("status.inProgress"), value: "In Progress" },
    { label: t("status.completed"), value: "Completed" },
    { label: t("status.managerVerification"), value: "Manager Verification" },
    { label: t("status.certificateIssued"), value: "Certificate Issued" }
  ];
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
    { key: "learner", header: t("assignments.column.learner"), render: (assignment) => <div className="table-primary-cell"><span className="assignment-icon table-cell-icon"><UserRound size={18} /></span><span><strong>{assignment.userName || t("assignments.unnamed")}</strong><small>{assignment.userEmail}</small></span></div> },
    { key: "course", header: t("assignments.column.course"), render: (assignment) => <div className="table-stacked-cell"><strong>{assignment.courseTitle || t("assignments.untitled")}</strong><small>{assignment.department || t("courses.allDepartments")}</small></div> },
    { key: "role", header: t("assignments.column.role"), render: (assignment) => <span className="chip">{roleOptions.find((option) => option.value === assignment.role)?.label ?? assignment.role ?? t("role.employee")}</span> },
    { key: "progress", header: t("assignments.column.progress"), render: (assignment) => <div className="table-progress"><span><StatusPill tone={statusTone(assignment.status)}>{statusLabel(assignment.status, t)}</StatusPill><small>{progressPercent(assignment.status)}%</small></span><div className="workflow-track"><span className="workflow-fill" style={{ width: `${progressPercent(assignment.status)}%` }} /></div></div> },
    { key: "due", header: t("assignments.column.due"), render: (assignment) => <div className="table-stacked-cell"><strong>{formatDate(assignment.dueAt, language, t("assignments.noDueDate"))}</strong><small>{assignment.autoAssigned ? t("assignments.auto") : t("assignments.manual")}</small></div> },
    { key: "actions", header: <span className="sr-only">{t("common.actions")}</span>, render: (assignment) => <div className="row-actions">{assignment.status === "Certificate Issued" ? <span className="completed-mark"><CheckCircle2 size={16} /> {t("assignments.complete")}</span> : null}{assignment.status === "Assigned" || assignment.status === "In Progress" ? <button className="icon-button table-action-button" disabled={advance.isPending} onClick={() => advance.mutate(assignment)}><Play size={15} /> {assignment.status === "Assigned" ? t("assignments.start") : t("assignments.complete")}</button> : null}</div> }
  ];

  function closeForm() {
    if (!create.isPending) setShowForm(false);
  }

  return <section>
    <PageHeader title={t("assignments.title")} subtitle={t("assignments.subtitle")} actions={<button className="primary-button" onClick={() => setShowForm(true)}><Plus size={16} /> {t("assignments.new")}</button>} />

    <CollectionFilters
      onClear={() => { setSearch(""); setStatus("all"); }}
      onSearchChange={setSearch}
      onStatusChange={setStatus}
      resultCount={rows.length}
      resultLabel={rows.length === 1 ? t("assignments.one") : t("assignments.many")}
      search={search}
      searchPlaceholder={t("assignments.search")}
      statusOptions={statusOptions}
      statusValue={status}
    />

    {rows.length ? <DataTable columns={columns} rows={rows} getRowId={(assignment) => recordId(assignment)} paginated /> : <EmptyState icon={<ClipboardList size={28} />} title={search || status !== "all" ? t("assignments.emptyFiltered") : t("assignments.empty")} description={search || status !== "all" ? t("assignments.emptyFilteredDescription") : t("assignments.emptyDescription")} />}

    {showForm ? <Modal onClose={closeForm} title={t("assignments.modal.title")}>
      <p>{t("assignments.modal.description")}</p>
      <form className="form-grid modal-form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <div className="form-span"><SelectMenu label={t("assignments.form.course")} options={(courses.data ?? []).map((item) => ({ label: `${item.title}${item.code ? ` · ${item.code}` : ""}`, value: recordId(item) }))} placeholder={t("assignments.form.selectCourse")} value={form.courseId} onChange={(courseId) => setForm({ ...form, courseId })} /></div>
        <label className="form-field"><span>{t("assignments.form.name")}</span><input autoFocus required placeholder={t("assignments.form.fullName")} value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} /></label>
        <label className="form-field"><span>{t("assignments.form.email")}</span><input required type="email" placeholder="name@company.com" value={form.userEmail} onChange={(event) => setForm({ ...form, userEmail: event.target.value })} /></label>
        <label className="form-field"><span>{t("assignments.form.userId")}</span><input required placeholder={t("assignments.form.userIdPlaceholder")} value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} /></label>
        <SelectMenu label={t("assignments.form.role")} options={roleOptions} value={form.role} onChange={(role) => setForm({ ...form, role })} />
        <label className="form-field form-span"><span>{t("assignments.form.department")}</span><input placeholder={t("assignments.form.departmentPlaceholder")} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
        {create.isError ? <div className="form-error form-span">{errorMessage(create.error, t("assignments.form.error"))}</div> : null}
        <div className="form-actions"><button className="icon-button" type="button" onClick={closeForm}>{t("common.cancel")}</button><button className="primary-button" disabled={!form.courseId || !form.userName.trim() || !form.userEmail.trim() || !form.userId.trim() || create.isPending} type="submit">{create.isPending ? t("assignments.form.assigning") : t("assignments.form.create")}</button></div>
      </form>
    </Modal> : null}
  </section>;
}

function progressPercent(status?: string) {
  const step = WORKFLOW.indexOf(status ?? "Assigned");
  return Math.max(10, (step + 1) * 20);
}

function formatDate(value: string | undefined, language: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat(language, { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function statusLabel(status: string | undefined, t: ReturnType<typeof useT>["t"]) {
  const keys = { "Assigned": "status.assigned", "In Progress": "status.inProgress", "Completed": "status.completed", "Manager Verification": "status.managerVerification", "Certificate Issued": "status.certificateIssued" } as const;
  return t(keys[status as keyof typeof keys] ?? "status.assigned");
}
