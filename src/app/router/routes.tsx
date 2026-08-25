import { useEffect, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { RedirectIfAuthenticated, RequireAuth } from "./guards";
import { CallbackPage } from "../../features/auth/CallbackPage";
import { ErrorPage } from "../../features/auth/ErrorPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { ActivationPage } from "../../features/auth/ActivationPage";
import { ResetPasswordPage } from "../../features/auth/ResetPasswordPage";
import { NotFoundPage } from "../../features/auth/NotFoundPage";
import { DashboardPage } from "../../features/dashboard/DashboardPage";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { AssignmentsPage } from "../../features/compliance/AssignmentsPage";
import { CertificatesPage } from "../../features/compliance/CertificatesPage";
import { CoursesPage } from "../../features/compliance/CoursesPage";
import { SettingsPage } from "../../features/compliance/SettingsPage";
import { VerificationsPage } from "../../features/compliance/VerificationsPage";

const protectedRoutes = {
  "/": DashboardPage,
  "/assignments": AssignmentsPage,
  "/certificates": CertificatesPage,
  "/courses": CoursesPage,
  "/error": ErrorPage,
  "/profile": ProfilePage,
  "/settings": SettingsPage,
  "/verifications": VerificationsPage
};

export function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    const [nextPathname = "/", queryString = ""] = nextPath.split("?");
    window.history.pushState({}, "", nextPath);
    setPath(nextPathname);
    setSearch(queryString ? `?${queryString}` : "");
  }

  if (path === "/login/callback") {
    return <CallbackPage onNavigate={navigate} />;
  }

  if (path === "/activate") {
    const parameters = new URLSearchParams(search);
    return <ActivationPage code={parameters.get("code") || undefined} language={parameters.get("lang") || undefined} onNavigate={navigate} />;
  }

  if (path === "/resetpassword") {
    const parameters = new URLSearchParams(search);
    return <ResetPasswordPage code={parameters.get("code") || undefined} language={parameters.get("lang") || undefined} onNavigate={navigate} />;
  }

  if (path === "/login") {
    const returnTo = new URLSearchParams(search).get("returnTo") || undefined;
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <LoginPage returnTo={returnTo} />
      </RedirectIfAuthenticated>
    );
  }

  const Page = protectedRoutes[path as keyof typeof protectedRoutes];
  if (!Page) {
    return <NotFoundPage onNavigate={navigate} />;
  }

  return (
    <RequireAuth currentPath={path} onNavigate={navigate}>
      <AppShell activePath={path} onNavigate={navigate}>
        <Page />
      </AppShell>
    </RequireAuth>
  );
}
