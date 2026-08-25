import { Award, BookOpenCheck, ClipboardList, Home, Settings2, ShieldCheck, UserRound } from "lucide-react";

export const navItems = [
  { href: "/", labelKey: "nav.dashboard", icon: Home },
  { href: "/courses", labelKey: "nav.courses", icon: BookOpenCheck },
  { href: "/assignments", labelKey: "nav.assignments", icon: ClipboardList },
  { href: "/verifications", labelKey: "nav.verifications", icon: ShieldCheck },
  { href: "/certificates", labelKey: "nav.certificates", icon: Award },
  { href: "/settings", labelKey: "nav.settings", icon: Settings2 },
  { href: "/profile", labelKey: "nav.profile", icon: UserRound }
] as const;
