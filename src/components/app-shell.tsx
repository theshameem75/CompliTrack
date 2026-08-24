import type { ReactNode } from "react";
import { Award, BarChart3, Bell, BookOpen, ChevronDown, ClipboardCheck, HelpCircle, LayoutDashboard, LogOut, Menu, Search, Settings, Users } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export type RouteName = "dashboard" | "assignments" | "certificates" | "people" | "courses" | "reports" | "settings";
const nav: Array<{ section?: string; route?: RouteName; label?: string; icon?: typeof LayoutDashboard }> = [
  { section: "Workspace" },
  { route: "dashboard", label: "Overview", icon: LayoutDashboard },
  { route: "assignments", label: "Assignments", icon: ClipboardCheck },
  { route: "certificates", label: "Certificates", icon: Award },
  { route: "people", label: "People", icon: Users },
  { section: "Manage" },
  { route: "courses", label: "Courses", icon: BookOpen },
  { route: "reports", label: "Reports", icon: BarChart3 },
  { route: "settings", label: "Settings", icon: Settings },
];

const initials = (user: User) => `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}` || user.email?.[0]?.toUpperCase() || "U";
const fullName = (user: User) => `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "User";

export function AppShell({ route, user, assignmentCount, onRoute, onNotifications, onLogout, children }: { route: RouteName; user: User; assignmentCount: number; onRoute: (route: RouteName) => void; onNotifications: () => void; onLogout: () => void; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50/70 md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="desktop-sidebar sticky top-0 flex h-screen flex-col border-r bg-white px-4 py-5">
        <div className="px-2"><Brand /></div>
        <button className="mt-7 flex w-full items-center gap-3 rounded-xl border bg-stone-50 p-3 text-left transition hover:bg-stone-100">
          <Avatar text="AC" />
          <span className="min-w-0 flex-1"><b className="block truncate text-sm">Acme Corporation</b><small className="block text-xs text-muted-foreground">Enterprise workspace</small></span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        <nav className="mt-6 flex-1 space-y-1">
          {nav.map((item, index) => item.section ? <p key={item.section} className={cn("px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground", index === 0 && "pt-0")}>{item.section}</p> : (
            <button key={item.route} onClick={() => onRoute(item.route!)} className={cn("flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground", route === item.route && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary")}>
              {item.icon && <item.icon className="h-[18px] w-[18px]" />}<span>{item.label}</span>
              {item.route === "assignments" && assignmentCount > 0 && <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{assignmentCount}</span>}
            </button>
          ))}
        </nav>
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-primary/5 p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-primary shadow-sm"><HelpCircle className="h-4 w-4" /></span><span><b className="block text-xs">Need a hand?</b><small className="text-[11px] text-muted-foreground">Visit Help Center</small></span></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-muted"><Avatar text={initials(user)} /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{fullName(user)}</b><small className="block truncate text-xs text-muted-foreground">Workspace member</small></span><ChevronDown className="h-4 w-4 text-muted-foreground" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onSelect={onLogout}><LogOut className="h-4 w-4" /> Sign out</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button><span className="text-sm font-medium capitalize">{route === "dashboard" ? "Compliance overview" : route}</span></div>
          <div className="flex items-center gap-1"><Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="relative" onClick={onNotifications}><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" /></Button><span className="ml-2"><Avatar text={initials(user)} /></span></div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Avatar({ text }: { text: string }) { return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{text}</span>; }
