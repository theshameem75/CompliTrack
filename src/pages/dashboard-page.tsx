import { AlertTriangle, ArrowRight, Award, CheckCircle2, ClipboardCheck, Plus, ShieldCheck } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardData } from "@/types";
import { formatDate, idOf } from "@/types";

export function DashboardPage({ data, canAssign, onAssign, onRoute }: { data: DashboardData; canAssign: boolean; onAssign: () => void; onRoute: (route: "assignments" | "certificates") => void }) {
  const completed = data.assignments.filter((item) => item.status === "CertificateIssued").length;
  const compliance = data.assignments.length ? Math.round((completed / data.assignments.length) * 1000) / 10 : 100;
  const attention = data.assignments.filter((item) => ["Overdue", "Restricted"].includes(item.status)).length;
  const pending = data.completions.filter((item) => item.verificationStatus === "Pending").length;
  const expiring = data.certificates.filter((item) => item.status === "Expiring").length;
  const courseName = (courseId: string) => data.courses.find((course) => idOf(course) === courseId)?.name || courseId;
  const stats = [
    { label: "Overall compliance", value: `${compliance}%`, note: "Across active assignments", icon: ShieldCheck, progress: compliance },
    { label: "Active assignments", value: data.assignments.length, note: `${completed} certificates issued`, icon: ClipboardCheck },
    { label: "Need attention", value: attention, note: "Overdue or restricted", icon: AlertTriangle },
    { label: "Pending verification", value: pending, note: "Awaiting manager review", icon: CheckCircle2 },
  ];
  const departments = data.courses.reduce<Record<string, { total: number; complete: number }>>((result, course) => {
    const key = course.department || "Unassigned";
    const assignments = data.assignments.filter((item) => item.courseId === idOf(course));
    result[key] ||= { total: 0, complete: 0 };
    result[key].total += assignments.length;
    result[key].complete += assignments.filter((item) => item.status === "CertificateIssued").length;
    return result;
  }, {});

  return <div className="space-y-7">
    <PageHeading eyebrow={new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()).toUpperCase()} title="Compliance dashboard" description="Live training and certification status across your organization." action={canAssign ? <Button onClick={onAssign}><Plus className="h-4 w-4" /> Assign training</Button> : undefined} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, note, icon: Icon, progress }) => <Card key={label}><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div><p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>{progress !== undefined && <Progress value={progress} className="mt-3" />}<p className="mt-3 text-xs text-muted-foreground">{note}</p></CardContent></Card>)}</section>
    <section className="page-grid grid gap-5">
      <Card className="overflow-hidden"><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Compliance trend</CardTitle><CardDescription className="mt-1">Assignment status over the last 30 days</CardDescription></div><span className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground">Last 30 days</span></div></CardHeader><CardContent><div className="h-56 w-full rounded-xl bg-gradient-to-b from-primary/5 to-transparent p-3"><svg viewBox="0 0 650 190" className="h-full w-full" preserveAspectRatio="none"><defs><linearGradient id="complianceFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#a55b41" stopOpacity=".25"/><stop offset="1" stopColor="#a55b41" stopOpacity="0"/></linearGradient></defs><path fill="url(#complianceFill)" d="M0,144 C35,143 55,131 90,137 S143,124 174,130 S220,93 260,112 S309,90 342,96 S392,70 427,82 S469,73 505,67 S553,47 580,59 S621,26 650,33 L650,190 L0,190Z"/><path fill="none" stroke="#a55b41" strokeWidth="3" strokeLinecap="round" d="M0,144 C35,143 55,131 90,137 S143,124 174,130 S220,93 260,112 S309,90 342,96 S392,70 427,82 S469,73 505,67 S553,47 580,59 S621,26 650,33"/></svg></div><div className="mt-4 flex flex-wrap gap-5 text-xs text-muted-foreground"><span><b className="text-foreground">{compliance}%</b> compliant</span><span><b className="text-foreground">{data.assignments.length - completed - attention}</b> in progress</span><span><b className="text-foreground">{attention}</b> at risk</span></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Action required</CardTitle><CardDescription>Items that need your attention</CardDescription></CardHeader><CardContent className="space-y-2"><Action icon={Award} label={`${expiring} certificates expiring`} detail="Review certificate renewals" onClick={() => onRoute("certificates")} /><Action icon={CheckCircle2} label={`${pending} completions to verify`} detail="Waiting for manager review" onClick={() => onRoute("assignments")} /><Action icon={AlertTriangle} label={`${attention} assignments at risk`} detail="Access restrictions may apply" onClick={() => onRoute("assignments")} /></CardContent></Card>
    </section>
    <section className="page-grid grid gap-5"><div><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Recent assignments</h2><p className="text-sm text-muted-foreground">Latest training activity</p></div><Button variant="outline" size="sm" onClick={() => onRoute("assignments")}>View all</Button></div><DataTable headers={["Course", "Employee", "Status", "Due"]} rows={data.assignments.slice(0, 6).map((item) => [<b>{courseName(item.courseId)}</b>, item.employeeId, <StatusBadge status={item.status} />, formatDate(item.dueAt)])} empty="No assignments yet" /></div>
      <Card><CardHeader><CardTitle>Compliance by department</CardTitle><CardDescription>Current completion rate</CardDescription></CardHeader><CardContent className="space-y-5">{Object.entries(departments).slice(0, 5).map(([name, values]) => { const rate = values.total ? Math.round(values.complete / values.total * 100) : 100; return <div key={name}><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{name}</span><b>{rate}%</b></div><Progress value={rate} /></div>; })}{!Object.keys(departments).length && <p className="text-sm text-muted-foreground">Department data will appear once courses are assigned.</p>}</CardContent></Card>
    </section>
  </div>;
}

function Action({ icon: Icon, label, detail, onClick }: { icon: typeof Award; label: string; detail: string; onClick: () => void }) { return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><b className="block text-sm">{label}</b><small className="text-muted-foreground">{detail}</small></span><ArrowRight className="h-4 w-4 text-muted-foreground" /></button>; }
