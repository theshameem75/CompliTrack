import { BookOpenCheck, Plus, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createCourse } from "./complianceApi";
import { useComplianceData, useRefreshCompliance } from "./useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { StatusPill } from "../../shared/ui/StatusPill";

const ROLE_OPTIONS = ["employee", "manager", "hr-admin", "compliance-officer", "trainer"];

export function CoursesPage() {
  const { courses } = useComplianceData();
  const refresh = useRefreshCompliance();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", code: "", department: "", description: "", durationMinutes: 60, validityDays: 365, targetRoles: ["employee"] });
  const create = useMutation({
    mutationFn: () => createCourse({ ...form, certificateTemplate: "standard", isActive: true, localizedLabels: JSON.stringify({ "en-US": form.title }) }),
    onSuccess: () => { setShowForm(false); setForm({ title: "", code: "", department: "", description: "", durationMinutes: 60, validityDays: 365, targetRoles: ["employee"] }); void refresh(); }
  });
  const rows = useMemo(() => (courses.data ?? []).filter((course) => `${course.title} ${course.code}`.toLowerCase().includes(search.toLowerCase())), [courses.data, search]);

  return <section>
    <PageHeader title="Course catalog" subtitle="Role- and department-based mandatory training." actions={<button className="primary-button" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> New course</button>} />
    {showForm ? <div className="panel form-grid">
      <label className="form-field"><span>Course title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label className="form-field"><span>Course code</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></label>
      <label className="form-field"><span>Department</span><input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
      <label className="form-field"><span>Duration (minutes)</span><input type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></label>
      <label className="form-field"><span>Certificate validity (days)</span><input type="number" value={form.validityDays} onChange={(event) => setForm({ ...form, validityDays: Number(event.target.value) })} /></label>
      <label className="form-field"><span>Assign to roles</span><select multiple value={form.targetRoles} onChange={(event) => setForm({ ...form, targetRoles: Array.from(event.target.selectedOptions, (option) => option.value) })}>{ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}</select></label>
      <label className="form-field form-span"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <div className="form-actions"><button className="icon-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={!form.title || !form.code || create.isPending} onClick={() => create.mutate()}>Save course</button></div>
    </div> : null}
    <div className="toolbar"><label className="search-box"><Search size={16} /><input placeholder="Search courses" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span className="muted"><UsersRound size={16} /> Role changes are reconciled when assignments sync.</span></div>
    {rows.length ? <div className="card-grid">{rows.map((course) => <article className="course-card" key={String(course.ItemId ?? course.itemId)}>
      <div className="course-card-top"><span className="course-icon"><BookOpenCheck size={20} /></span><StatusPill tone={course.isActive ? "good" : "neutral"}>{course.isActive ? "Active" : "Draft"}</StatusPill></div>
      <div><span className="eyebrow">{course.code}</span><h3>{course.title}</h3><p>{course.description || "Mandatory compliance training"}</p></div>
      <div className="course-meta"><span>{course.department || "All departments"}</span><span>{course.durationMinutes ?? 0} min</span><span>{course.validityDays ?? 365} day validity</span></div>
      <div className="chips">{(course.targetRoles ?? []).map((role) => <span className="chip" key={role}>{role}</span>)}</div>
    </article>)}</div> : <EmptyState icon={<BookOpenCheck size={28} />} title="No courses yet" description="Create the first mandatory course and target it to employee roles." />}
  </section>;
}
