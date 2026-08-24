import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Bell, Loader2, Plus } from "lucide-react";
import { AppShell, type RouteName } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardPage } from "@/pages/dashboard-page";
import type { DashboardData, Entity, ModalState, User } from "@/types";
import { formatDate, idOf } from "@/types";
import { blocks, ensureSession, logout as endSession } from "../../blocks-client.js";
import * as api from "../../compliance-service.js";
import { apiErrorMessage, apiResponseMessage } from "../../api-response.js";

const blankData: DashboardData = { courses: [], assignments: [], completions: [], certificates: [], settings: [], complianceStatuses: [] };
const pathRoute = (): RouteName => {
  const value = (location.hash || "#dashboard").slice(1) as RouteName;
  return ["dashboard", "assignments", "certificates", "people", "courses", "reports", "settings"].includes(value) ? value : "dashboard";
};

export function Workspace() {
  const [route, setRoute] = useState<RouteName>(pathRoute);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [data, setData] = useState<DashboardData>(blankData);
  const [people, setPeople] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const notify = useCallback((text: string, isError = false) => {
    setToast({ text, error: isError });
    window.setTimeout(() => setToast(null), 3200);
  }, []);
  const can = useCallback((permission: string) => permissions.has(permission) || permissions.has("*"), [permissions]);
  const orgId = () => user?.organizationId || user?.OrganizationId || "default";
  const userId = () => idOf(user || undefined);
  const courseName = (courseId: string) => data.courses.find((course) => idOf(course) === courseId)?.name || courseId;
  const refresh = useCallback(async () => setData(await api.loadDashboard()), []);

  useEffect(() => {
    const onHash = () => setRoute(pathRoute());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      if (!(await ensureSession())) { location.href = `/login?returnTo=${encodeURIComponent(location.pathname + location.hash)}`; return; }
      try {
        const response = await blocks.iam.me();
        const me: User = (response as any)?.data || response;
        const values = me.permissions || [];
        const dashboard = await api.loadDashboard();
        if (!current) return;
        setUser(me);
        setPermissions(new Set(values.map((item) => typeof item === "string" ? item : item.name || item.slug || "")));
        setData(dashboard);
      } catch (reason) { if (current) setError(apiErrorMessage(reason, "Unable to initialize CompliTrack.")); }
      finally { if (current) setLoading(false); }
    })();
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (route !== "people" || !user) return;
    blocks.iam.users.list({ pageNo: 1, pageSize: 100 }).then((result: any) => {
      const source = result?.data || result;
      setPeople(Array.isArray(source) ? source : source?.users || source?.items || result?.users || result?.items || []);
    }).catch((reason: unknown) => notify(apiErrorMessage(reason), true));
  }, [route, user, notify]);

  const navigate = (next: RouteName) => { location.hash = next; setRoute(next); };
  const run = async (operation: () => Promise<any>, success: string, after?: () => Promise<void> | void) => {
    try {
      const response = await operation();
      notify(api.consumeApiMessage(apiResponseMessage(response, success)));
      if (after) await after();
      return response;
    } catch (reason) { notify(apiErrorMessage(reason), true); }
  };
  const logout = async () => { await endSession().catch(() => undefined); location.href = "/login"; };

  if (loading) return <div className="grid min-h-screen place-items-center bg-stone-50"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Loading your compliance workspace…</p></div></div>;
  if (error || !user) return <div className="grid min-h-screen place-items-center p-6"><Card className="max-w-lg"><CardContent className="p-8 text-center"><p className="font-semibold">CompliTrack could not start</p><p className="mt-2 text-sm text-destructive">{error}</p><Button className="mt-5" onClick={() => location.reload()}>Try again</Button></CardContent></Card></div>;

  const content: Record<RouteName, ReactNode> = {
    dashboard: <DashboardPage data={data} canAssign={can("course:assign")} onAssign={() => setModal({ kind: "assignment" })} onRoute={navigate} />,
    assignments: <AssignmentsPage data={data} userId={userId()} canAssign={can("course:assign")} canVerify={can("course:verify")} canIssue={can("certificate:issue")} courseName={courseName} onModal={setModal} run={run} refresh={refresh} />,
    certificates: <CertificatesPage data={data} canRevoke={can("certificate:revoke")} courseName={courseName} run={run} refresh={refresh} actorId={userId()} />,
    people: <PeoplePage people={people} canAssign={can("course:assign")} settings={data.settings[0]} organizationId={orgId()} actorId={userId()} run={run} refresh={refresh} />,
    courses: <CoursesPage data={data} canCreate={can("course:create")} onModal={setModal} />,
    reports: <ReportsPage data={data} />,
    settings: <SettingsPage settings={data.settings[0]} canUpdate={can("settings:update")} organizationId={orgId()} actorId={userId()} run={run} refresh={refresh} />,
  };

  return <>
    <AppShell route={route} user={user} assignmentCount={data.assignments.length} onRoute={navigate} onNotifications={() => setModal({ kind: "notifications" })} onLogout={logout}>{content[route]}</AppShell>
    <WorkspaceModal state={modal} setState={setModal} data={data} organizationId={orgId()} actorId={userId()} run={run} refresh={refresh} navigate={navigate} />
    {toast && <div className={`fixed bottom-5 right-5 z-[100] max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-xl ${toast.error ? "bg-destructive" : "bg-stone-900"}`} role="status">{toast.text}</div>}
  </>;
}

type Run = (operation: () => Promise<any>, success: string, after?: () => Promise<void> | void) => Promise<any>;

function AssignmentsPage({ data, userId, canAssign, canVerify, canIssue, courseName, onModal, run, refresh }: { data: DashboardData; userId: string; canAssign: boolean; canVerify: boolean; canIssue: boolean; courseName: (id: string) => string; onModal: (value: ModalState) => void; run: Run; refresh: () => Promise<void> }) {
  const review = async (assignment: Entity, completion: Entity, approved: boolean) => {
    const reason = approved ? "" : prompt("Reason for rejection");
    if (!approved && !reason) return;
    await run(async () => {
      await api.verifyCompletion({ completion, assignment, managerId: userId, approved, reason: reason || "" });
      if (approved && canIssue) {
        const course = data.courses.find((item) => idOf(item) === assignment.courseId);
        await api.issueCertificate({ completion: { ...completion, verificationStatus: "Approved" }, assignment, course, settings: data.settings[0] || { managerVerificationRequired: true }, issuerId: userId, pdfFileId: null });
      }
    }, approved ? "Completion approved" : "Completion rejected", refresh);
  };
  return <Section heading={<PageHeading title="Assignments" description="Follow assigned training from start through certification." action={canAssign ? <Button onClick={() => onModal({ kind: "assignment" })}><Plus className="h-4 w-4" /> Assign training</Button> : undefined} />}>
    <DataTable headers={["Course", "Employee", "Status", "Due", "Action"]} empty="No assignments" rows={data.assignments.map((item) => {
      const completion = data.completions.find((value) => value.assignmentId === idOf(item) && value.verificationStatus === "Pending");
      const actions: ReactNode[] = [];
      if (item.employeeId === userId && ["Assigned", "Overdue", "Restricted"].includes(item.status)) actions.push(<Button key="start" variant="outline" size="sm" onClick={() => run(() => api.startAssignment(item, userId), "Assignment started", refresh)}>Start</Button>);
      if (item.employeeId === userId && item.status === "InProgress") actions.push(<Button key="complete" size="sm" onClick={() => onModal({ kind: "completion", item })}>Complete</Button>);
      if (completion && canVerify) actions.push(<Button key="approve" size="sm" onClick={() => review(item, completion, true)}>Approve</Button>, <Button key="reject" variant="outline" size="sm" onClick={() => review(item, completion, false)}>Reject</Button>);
      return [<b>{courseName(item.courseId)}</b>, item.employeeId, <StatusBadge status={item.status} />, formatDate(item.dueAt), <div className="flex flex-wrap gap-2">{actions}</div>];
    })} />
  </Section>;
}

function CertificatesPage({ data, canRevoke, courseName, run, refresh, actorId }: { data: DashboardData; canRevoke: boolean; courseName: (id: string) => string; run: Run; refresh: () => Promise<void>; actorId: string }) {
  const revoke = async (item: Entity) => { const reason = prompt("Reason for revocation"); if (reason) await run(() => api.revokeCertificate(item, actorId, reason), "Certificate revoked", refresh); };
  return <Section heading={<PageHeading title="Certificates" description="Issued, expiring, expired, and revoked certificates." />}><DataTable headers={["Number", "Course", "Employee", "Status", "Expires", ""]} empty="No certificates" rows={data.certificates.map((item) => [item.certificateNumber, <b>{courseName(item.courseId)}</b>, item.employeeId, <StatusBadge status={item.status} />, formatDate(item.expiresAt), canRevoke && item.status !== "Revoked" ? <Button variant="outline" size="sm" onClick={() => revoke(item)}>Revoke</Button> : null])} /></Section>;
}

function CoursesPage({ data, canCreate, onModal }: { data: DashboardData; canCreate: boolean; onModal: (value: ModalState) => void }) {
  return <Section heading={<PageHeading title="Courses" description="Create and maintain mandatory training by role and department." action={canCreate ? <Button onClick={() => onModal({ kind: "course" })}><Plus className="h-4 w-4" /> New course</Button> : undefined} />}><DataTable headers={["Course", "Roles", "Duration", "Validity", "State", ""]} empty="No courses yet" rows={data.courses.map((course) => [<span><b className="block">{course.name}</b><small className="text-muted-foreground">{course.department}</small></span>, (course.requiredRoles || []).join(", "), `${course.durationMinutes} min`, `${course.validityDays} days`, <StatusBadge status={course.isActive ? "Active" : "Inactive"} />, canCreate ? <Button variant="outline" size="sm" onClick={() => onModal({ kind: "course", item: course })}>Edit</Button> : null])} /></Section>;
}

function PeoplePage({ people, canAssign, settings, organizationId, actorId, run, refresh }: { people: Entity[]; canAssign: boolean; settings?: Entity; organizationId: string; actorId: string; run: Run; refresh: () => Promise<void> }) {
  const changeRole = async (person: Entity) => { const role = prompt("New role slug"); if (role) await run(() => api.changeEmployeeRole({ employee: person, role, organizationId, actorId, autoAssign: settings?.autoAssignOnRoleChange ?? true }), "Role and assignments updated", refresh); };
  return <Section heading={<PageHeading title="People" description="Employees and their compliance access state." />}><DataTable headers={["Name", "Email", "Roles", "Status", ""]} empty="No people available" rows={people.map((person) => [<b>{`${person.firstName || ""} ${person.lastName || ""}`.trim() || "Unnamed user"}</b>, person.email, (person.roles || []).join(", "), <StatusBadge status={person.active === false ? "Inactive" : "Active"} />, canAssign ? <Button variant="outline" size="sm" onClick={() => changeRole(person)}>Change role</Button> : null])} /></Section>;
}

function ReportsPage({ data }: { data: DashboardData }) {
  const departments = new Map<string, { total: number; complete: number }>();
  data.courses.forEach((course) => { const assignments = data.assignments.filter((item) => item.courseId === idOf(course)); const value = departments.get(course.department || "Unassigned") || { total: 0, complete: 0 }; value.total += assignments.length; value.complete += assignments.filter((item) => item.status === "CertificateIssued").length; departments.set(course.department || "Unassigned", value); });
  return <Section heading={<PageHeading title="Compliance reports" description="Completion and certification performance by department." />}><DataTable headers={["Department", "Assignments", "Compliant", "Rate"]} empty="No report data" rows={[...departments].map(([department, value]) => [<b>{department}</b>, value.total, value.complete, `${value.total ? Math.round(value.complete / value.total * 100) : 100}%`])} /></Section>;
}

function SettingsPage({ settings = {}, canUpdate, organizationId, actorId, run, refresh }: { settings?: Entity; canUpdate: boolean; organizationId: string; actorId: string; run: Run; refresh: () => Promise<void> }) {
  const defaults: Entity = { organizationId, gracePeriodDays: 7, reminderDays: [60, 30, 7], defaultLocale: "en-US", restrictedRoleSlug: "restricted-user", autoAssignOnRoleChange: true, managerVerificationRequired: true, autoRestrictNonCompliant: true, autoRestoreAccess: true, ...settings };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); run(() => api.saveOrgSettings({ ...defaults, ...values, autoAssignOnRoleChange: form.autoAssignOnRoleChange.checked, managerVerificationRequired: form.managerVerificationRequired.checked, autoRestrictNonCompliant: form.autoRestrictNonCompliant.checked, autoRestoreAccess: form.autoRestoreAccess.checked }, actorId), "Settings saved", refresh); };
  return <Section heading={<PageHeading title="Organization settings" description="Configure assignment, verification, expiry, and restricted-access policy." />}><Card className="max-w-3xl"><CardContent className="p-6"><form className="grid gap-5" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><Field label="Grace period (days)" name="gracePeriodDays" type="number" min="0" defaultValue={defaults.gracePeriodDays} disabled={!canUpdate} /><Field label="Reminder days" name="reminderDays" defaultValue={(defaults.reminderDays || []).join(",")} disabled={!canUpdate} /><Field label="Default locale" name="defaultLocale" defaultValue={defaults.defaultLocale} disabled={!canUpdate} /><Field label="Restricted role slug" name="restrictedRoleSlug" defaultValue={defaults.restrictedRoleSlug} disabled={!canUpdate} /></div>{[["autoAssignOnRoleChange", "Auto-assign after role change"], ["managerVerificationRequired", "Require manager verification"], ["autoRestrictNonCompliant", "Restrict access after grace period"], ["autoRestoreAccess", "Restore access when compliant"]].map(([name, label]) => <label className="check-row" key={name}><input name={name} type="checkbox" defaultChecked={Boolean(defaults[name])} disabled={!canUpdate} /> {label}</label>)}{canUpdate && <Button className="w-fit">Save settings</Button>}</form></CardContent></Card></Section>;
}

function WorkspaceModal({ state, setState, data, organizationId, actorId, run, refresh, navigate }: { state: ModalState; setState: (state: ModalState) => void; data: DashboardData; organizationId: string; actorId: string; run: Run; refresh: () => Promise<void>; navigate: (route: RouteName) => void }) {
  const close = () => setState(null);
  const submitCourse = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values: any = Object.fromEntries(new FormData(form)); run(() => api.saveCourse({ ...(state?.kind === "course" ? state.item : {}), ...values, organizationId, isActive: form.isActive.checked, isMandatory: form.isMandatory.checked, managerVerificationRequired: form.managerVerificationRequired.checked }, actorId), "Course saved", async () => { close(); await refresh(); navigate("courses"); }); };
  const submitAssignment = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values: any = Object.fromEntries(new FormData(event.currentTarget)); run(() => api.assignCourse({ ...values, dueAt: new Date(`${values.dueAt}T23:59:59`).toISOString(), organizationId, assignedBy: actorId }), "Training assigned", async () => { close(); await refresh(); navigate("assignments"); }); };
  const submitCompletion = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (state?.kind !== "completion") return; const form = event.currentTarget; const assignment = state.item; run(async () => { const file = form.evidence.files?.[0]; const evidenceFileId = await api.uploadEvidence(file); return api.submitCompletion(assignment, actorId, evidenceFileId, Number(form.score.value), form.notes.value); }, "Completion submitted", async () => { close(); await refresh(); }); };
  const course = state?.kind === "course" ? state.item || {} : {};
  return <Dialog open={Boolean(state)} onOpenChange={(open) => !open && close()}><DialogContent>
    {state?.kind === "course" && <><DialogHeader><DialogTitle>{course.name ? "Edit course" : "Create course"}</DialogTitle><DialogDescription>Define the training requirement and certification policy.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={submitCourse}><div className="grid gap-4 sm:grid-cols-2"><Field label="Course code" name="code" defaultValue={course.code} /><Field label="Name" name="name" defaultValue={course.name} /></div><Field label="Localization key" name="localizedNameKey" defaultValue={course.localizedNameKey || "course.name"} /><FieldArea label="Description" name="description" defaultValue={course.description} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Category" name="category" defaultValue={course.category} /><Field label="Training type" name="trainingType" defaultValue={course.trainingType} /></div><Field label="Provider" name="provider" defaultValue={course.provider} /><Field label="Department" name="department" defaultValue={course.department} /><Field label="Required roles (comma separated)" name="requiredRoles" defaultValue={(course.requiredRoles || []).join(",")} /><Field label="Supported languages" name="supportedLanguages" defaultValue={(course.supportedLanguages || ["en-US"]).join(",")} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Duration minutes" name="durationMinutes" type="number" min="1" defaultValue={course.durationMinutes || 30} /><Field label="Validity days" name="validityDays" type="number" min="1" defaultValue={course.validityDays || 365} /></div><Field label="Certificate template ID" name="certificateTemplateId" defaultValue={course.certificateTemplateId} />{[["isMandatory", "Mandatory training", course.isMandatory !== false], ["managerVerificationRequired", "Require manager verification", course.managerVerificationRequired !== false], ["isActive", "Active", course.isActive !== false]].map(([name, label, checked]) => <label className="check-row" key={String(name)}><input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} /> {String(label)}</label>)}<DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button>Save course</Button></DialogFooter></form></>}
    {state?.kind === "assignment" && <><DialogHeader><DialogTitle>Assign training</DialogTitle><DialogDescription>Assign an active course to an employee.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={submitAssignment}><div className="field"><Label>Course</Label><select className="native-select" name="courseId" required>{data.courses.filter((item) => item.isActive).map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></div><Field label="Employee ID" name="employeeId" /><Field label="Employee role" name="sourceRole" /><Field label="Due date" name="dueAt" type="date" /><DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button>Assign course</Button></DialogFooter></form></>}
    {state?.kind === "completion" && <><DialogHeader><DialogTitle>Complete training</DialogTitle><DialogDescription>Upload evidence and submit the completion for review.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={submitCompletion}><Field label="Evidence file" name="evidence" type="file" /><Field label="Score" name="score" type="number" min="0" max="100" /><FieldArea label="Notes" name="notes" /><DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button>Submit completion</Button></DialogFooter></form></>}
    {state?.kind === "notifications" && <Notifications run={run} />}
  </DialogContent></Dialog>;
}

function Notifications({ run }: { run: Run }) {
  const [items, setItems] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getNotifications({ isUnreadOnly: false, page: 1, pageSize: 20 }).then((result: any) => setItems(result?.notifications || result?.data?.notifications || [])).finally(() => setLoading(false)); }, []);
  return <><DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notifications</DialogTitle><DialogDescription>Recent compliance alerts and updates.</DialogDescription></DialogHeader><div className="grid gap-2">{loading ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-primary" /> : items.length ? items.map((item) => <button key={item.id} onClick={() => run(() => api.markNotificationRead(item.id), "Notification marked as read")} className="rounded-lg border p-3 text-left hover:bg-muted"><b className="block text-sm">{item.title || "Compliance alert"}</b><small className="mt-1 block text-muted-foreground">{item.message || item.denormalizedPayload || ""}</small></button>) : <p className="py-8 text-center text-sm text-muted-foreground">No notifications</p>}</div>{items.length > 0 && <DialogFooter><Button variant="outline" onClick={() => run(() => api.markAllNotificationsRead(), "All notifications marked as read")}>Mark all as read</Button></DialogFooter>}</>;
}

function Section({ heading, children }: { heading: ReactNode; children: ReactNode }) { return <div className="space-y-7">{heading}{children}</div>; }
function Field({ label, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) { return <div className="field"><Label htmlFor={props.name}>{label}</Label><Input id={props.name} required {...props} /></div>; }
function FieldArea({ label, ...props }: React.ComponentProps<typeof Textarea> & { label: string; name: string }) { return <div className="field"><Label htmlFor={props.name}>{label}</Label><Textarea id={props.name} {...props} /></div>; }
