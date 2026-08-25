import { BookOpenCheck, Clock3, Plus } from "lucide-react";
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
import { CollectionFilters } from "../../shared/ui/CollectionFilters";
import { useT } from "../../lib/i18n/LocalizationProvider";

const EMPTY_FORM = { title: "", code: "", department: "", description: "", durationMinutes: 60, validityDays: 365, targetRoles: ["employee"] };

export function CoursesPage() {
  const { courses } = useComplianceData();
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
    { label: t("status.active"), value: "active" },
    { label: t("status.draft"), value: "draft" }
  ];
  const create = useMutation({
    mutationFn: () => createCourse({ ...form, certificateTemplate: "standard", isActive: true, localizedLabels: JSON.stringify({ [language]: form.title }) }),
    onSuccess: () => {
      setShowForm(false);
      setForm(EMPTY_FORM);
      void refresh();
    }
  });
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (courses.data ?? []).filter((course) => {
      const matchesSearch = `${course.title} ${course.code} ${course.department} ${(course.targetRoles ?? []).join(" ")}`.toLowerCase().includes(query);
      const matchesStatus = status === "all" || (status === "active" ? course.isActive : !course.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [courses.data, search, status]);

  const columns: Column<Course>[] = [
    { key: "course", header: t("courses.column.course"), render: (course) => <div className="table-primary-cell"><span className="course-icon table-cell-icon"><BookOpenCheck size={18} /></span><span><strong>{course.title}</strong><small>{course.description || t("courses.mandatory")}</small></span></div> },
    { key: "code", header: t("courses.column.code"), render: (course) => <span className="code-badge">{course.code || "—"}</span> },
    { key: "department", header: t("courses.column.department"), render: (course) => course.department || <span className="muted">{t("courses.allDepartments")}</span> },
    { key: "roles", header: t("courses.column.roles"), render: (course) => <div className="compact-chips">{(course.targetRoles ?? []).length ? (course.targetRoles ?? []).map((role) => <span className="chip" key={role}>{roleOptions.find((option) => option.value === role)?.label ?? role}</span>) : <span className="muted">{t("courses.noRoles")}</span>}</div> },
    { key: "duration", header: t("courses.column.duration"), render: (course) => <span className="table-inline-meta"><Clock3 size={14} /> {course.durationMinutes ?? 0} {t("courses.minutes")}</span> },
    { key: "validity", header: t("courses.column.validity"), render: (course) => `${course.validityDays ?? 365} ${t("courses.days")}` },
    { key: "status", header: t("common.status"), render: (course) => <StatusPill tone={course.isActive ? "good" : "neutral"}>{course.isActive ? t("status.active") : t("status.draft")}</StatusPill> }
  ];

  function closeForm() {
    if (create.isPending) return;
    setShowForm(false);
  }

  return <section>
    <PageHeader title={t("courses.title")} subtitle={t("courses.subtitle")} actions={<button className="primary-button" onClick={() => setShowForm(true)}><Plus size={16} /> {t("courses.new")}</button>} />

    <CollectionFilters
      onClear={() => { setSearch(""); setStatus("all"); }}
      onSearchChange={setSearch}
      onStatusChange={setStatus}
      resultCount={rows.length}
      resultLabel={rows.length === 1 ? t("courses.one") : t("courses.many")}
      search={search}
      searchPlaceholder={t("courses.search")}
      statusOptions={statusOptions}
      statusValue={status}
    />

    {rows.length ? <DataTable columns={columns} rows={rows} getRowId={(course) => recordId(course)} paginated /> : <EmptyState icon={<BookOpenCheck size={28} />} title={search || status !== "all" ? t("courses.emptyFiltered") : t("courses.empty")} description={search || status !== "all" ? t("courses.emptyFilteredDescription") : t("courses.emptyDescription")} />}

    {showForm ? <Modal onClose={closeForm} title={t("courses.modal.title")}>
      <p>{t("courses.modal.description")}</p>
      <form className="form-grid modal-form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <label className="form-field"><span>{t("courses.form.title")}</span><input autoFocus required placeholder={t("courses.form.titlePlaceholder")} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label className="form-field"><span>{t("courses.form.code")}</span><input required placeholder={t("courses.form.codePlaceholder")} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></label>
        <label className="form-field"><span>{t("courses.form.department")}</span><input placeholder={t("courses.allDepartments")} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
        <MultiSelectMenu label={t("courses.form.roles")} options={roleOptions} values={form.targetRoles} onChange={(targetRoles) => setForm({ ...form, targetRoles })} />
        <label className="form-field"><span>{t("courses.form.duration")}</span><input min={1} required type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></label>
        <label className="form-field"><span>{t("courses.form.validity")}</span><input min={1} required type="number" value={form.validityDays} onChange={(event) => setForm({ ...form, validityDays: Number(event.target.value) })} /></label>
        <label className="form-field form-span"><span>{t("courses.form.description")}</span><textarea placeholder={t("courses.form.descriptionPlaceholder")} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        {create.isError ? <div className="form-error form-span">{errorMessage(create.error, t("courses.form.error"))}</div> : null}
        <div className="form-actions"><button className="icon-button" type="button" onClick={closeForm}>{t("common.cancel")}</button><button className="primary-button" disabled={!form.title.trim() || !form.code.trim() || !form.targetRoles.length || create.isPending} type="submit">{create.isPending ? t("courses.form.creating") : t("courses.form.create")}</button></div>
      </form>
    </Modal> : null}
  </section>;
}

function errorMessage(error: unknown, fallback = "The course could not be created. Please try again.") {
  return error instanceof Error ? error.message : fallback;
}
