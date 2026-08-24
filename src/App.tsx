import { AuthPage } from "@/pages/auth-page";
import { Workspace } from "@/pages/workspace";

const authPaths = new Set(["/activate", "/recover", "/reset-password", "/login", "/login/callback"]);

export default function App() {
  return authPaths.has(location.pathname) ? <AuthPage /> : <Workspace />;
}
