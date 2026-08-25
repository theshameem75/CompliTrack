import { BookOpenCheck, Clock3, Plus, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createCourse, recordId } from "./complianceApi";
import type { Course } from "./complianceApi";
import { useComplianceData, useRefreshCompliance } from "./useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { StatusPill } from "../../shared/ui/StatusPill";
import { DataTable } from "../../shared/ui/DataTable";
import type { Column } from "../../shared/ui/DataTable";
import { Modal } from "../../shared/ui/Modal";
import { MultiSelectMenu } from "../../shared/ui/SelectMenu";

const ROLE_OPTIONS = [
  { label: "Employee", value: "employee" },
  { label: "Manager", value: "manager" },
  { label: "HR Admin", value: "hr-admin" },
  { label: "Compliance Officer", value: "compliance-officer" },
  { label: "Trainer", value: "trainer" }
];

const EMPTY_FORM = { title: "", code: "", department: "", description: "", durationMinutes: 60, validityDays: 365, targetRoles: ["employee"] };

export function CoursesPage() {
  const { courses } = useComplianceData();
  const refresh = useRefreshCompliance();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const create = useMutation({
    mutationFn: () => createCourse({ ...form, certificateTemplate: "standard", isActive: true, localizedLabels: JSON.stringify({ "en-US": form.title }) }),
    onSuccess: () => {
      setShowForm(false);
      setForm(EMPTY_FORM);
      void refresh();
    }
  });
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (courses.data ?? []).filter((course) => `${course.title} ${course.code} ${course.department} ${(course.targetRoles ?? []).join(" ")}`.toLowerCase().includes(query));
  }, [courses.data, search]);

  const columns: Column<Course>[] = [
    { key: "course", header: "Course", render: (course) => <div className="table-primary-cell"><span className="course-icon table-cell-icon"><BookOpenCheck size={18} /></span><span><strong>{course.title}</strong><small>{course.description || "Mandatory compliance training"}</small></span></div> },
    { key: "code", header: "Code", render: (course) => <span className="code-badge">{course.code || "—"}</span> },
    { key: "department", header: "Department", render: (course) => course.department || <span className="muted">All departments</span> },
    { key: "roles", header: "Assigned roles", render: (course) => <div className="compact-chips">{(course.targetRoles ?? []).length ? (course.targetRoles ?? []).map((role) => <span className="chip" key={role}>{roleLabel(role)}</span>) : <span className="muted">No roles</span>}</div> },
    { key: "duration", header: "Duration", render: (course) => <span className="table-inline-meta"><Clock3 size={14} /> {course.durationMinutes ?? 0} min</span> },
    { key: "validity", header: "Validity", render: (course) => `${course.validityDays ?? 365} days` },
    { key: "status", header: "Status", render: (course) => <StatusPill tone={course.isActive ? "good" : "neutral"}>{course.isActive ? "Active" : "Draft"}</StatusPill> }
  ];

  function closeForm() {
    if (create.isPending) return;
    setShowForm(false);
  }

  return <section>
    <PageHeader title="Course catalog" subtitle="Create role-based learning programs and keep every certification current." actions={<button className="primary-button" onClick={() => setShowForm(true)}><Plus size={16} /> New course</button>} />

    <div className="toolbar table-toolbar">
      <label className="search-box"><Search size={16} /><input aria-label="Search courses" placeholder="Search title, code, department, or role" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <span className="toolbar-insight"><UsersRound size={16} /><span><strong>{rows.length}</strong> course{rows.length === 1 ? "" : "s"}<small>Role changes sync automatically</small></span></span>
    </div>

    {rows.length ? <DataTable columns={columns} rows={rows} getRowId={(course) => recordId(course)} paginated /> : <EmptyState icon={<BookOpenCheck size={28} />} title={search ? "No matching courses" : "No courses yet"} description={search ? "Try a different search term or clear the filter." : "Create the first mandatory course and target it to employee roles."} />}

    {showForm ? <Modal onClose={closeForm} title="Create a new course">
      <p>Set up the course details and choose which roles should receive it automatically.</p>
      <form className="form-grid modal-form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <label className="form-field"><span>Course title</span><input autoFocus required placeholder="e.g. Workplace safety essentials" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label className="form-field"><span>Course code</span><input required placeholder="e.g. SAFE-101" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></label>
        <label className="form-field"><span>Department</span><input placeholder="All departments" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
        <MultiSelectMenu label="Assign to roles" options={ROLE_OPTIONS} values={form.targetRoles} onChange={(targetRoles) => setForm({ ...form, targetRoles })} />
        <label className="form-field"><span>Duration (minutes)</span><input min={1} required type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></label>
        <label className="form-field"><span>Certificate validity (days)</span><input min={1} required type="number" value={form.validityDays} onChange={(event) => setForm({ ...form, validityDays: Number(event.target.value) })} /></label>
        <label className="form-field form-span"><span>Description</span><textarea placeholder="What will employees learn and why is it required?" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        {create.isError ? <div className="form-error form-span">{errorMessage(create.error)}</div> : null}
        <div className="form-actions"><button className="icon-button" type="button" onClick={closeForm}>Cancel</button><button className="primary-button" disabled={!form.title.trim() || !form.code.trim() || !form.targetRoles.length || create.isPending} type="submit">{create.isPending ? "Creating…" : "Create course"}</button></div>
      </form>
    </Modal> : null}
  </section>;
}

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The course could not be created. Please try again.";
}
