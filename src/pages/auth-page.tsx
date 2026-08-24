import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { blocks, completeLogin, startLogin } from "../../blocks-client.js";
import { apiErrorMessage, apiResponseMessage } from "../../api-response.js";

type Mode = "login" | "signup" | "recover" | "reset" | "activate" | "callback";
const query = () => new URLSearchParams(location.search);
const activationCode = () => query().get("activationCode") || query().get("code") || "";

function routeMode(): Mode {
  if (location.pathname === "/login/callback") return "callback";
  if (location.pathname === "/activate") return "activate";
  if (location.pathname === "/recover") return "recover";
  if (location.pathname === "/reset-password") return "reset";
  return (query().get("mode") as Mode) || "login";
}

const copy: Record<Exclude<Mode, "callback">, [string, string, string]> = {
  login: ["Welcome back", "Sign in to manage training compliance.", "Continue with SSO"],
  signup: ["Create your account", "Set up your CompliTrack workspace account.", "Create account"],
  recover: ["Recover your account", "We’ll send recovery instructions to your email.", "Send recovery email"],
  reset: ["Reset your password", "Choose a new secure password for your account.", "Set new password"],
  activate: ["Activate your account", "Confirm your invitation to join the workspace.", "Activate account"],
};

export function AuthPage() {
  const [mode, setMode] = useState<Mode>(routeMode);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(mode === "callback");
  const [activationReady, setActivationReady] = useState(mode !== "activate");
  const text = useMemo(() => mode === "callback" ? ["Completing sign in", "Please wait while we verify your secure session.", ""] : copy[mode], [mode]);

  useEffect(() => {
    if (mode === "callback") {
      completeLogin(location.href).then((returnTo: string) => location.replace(returnTo)).catch((error: unknown) => {
        setMessage(apiErrorMessage(error));
        setBusy(false);
      });
      return;
    }
    if (mode === "activate") {
      const code = activationCode();
      if (!code) { setMessage("This activation link is missing its activation code."); return; }
      setBusy(true);
      blocks.auth.validateActivation({ activationCode: code }).then((response: any) => {
        if (response?.error || response?.isSuccess === false || response?.valid === false) throw response;
        setActivationReady(true);
      }).catch((error: unknown) => setMessage(apiErrorMessage(error, "This activation link is invalid or has expired."))).finally(() => setBusy(false));
    }
  }, [mode]);

  const switchMode = (next: Mode) => {
    const path = next === "recover" ? "/recover" : next === "reset" ? "/reset-password" : "/login";
    history.replaceState({}, "", path);
    setMessage("");
    setMode(next);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const request: any = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "login") {
        await startLogin(query().get("returnTo") || "/");
        return;
      }
      if (mode === "activate" && request.password !== request.confirmPassword) throw new Error("Passwords do not match.");
      delete request.confirmPassword;
      if (mode === "activate") { request.code = request.activationCode; delete request.activationCode; }
      const response = mode === "activate" ? await blocks.auth.activate(request)
        : mode === "signup" ? await blocks.auth.signup(request)
          : mode === "recover" ? await blocks.auth.recover(request)
            : await blocks.auth.resetPassword(request);
      if ((response as any)?.error || (response as any)?.isSuccess === false) throw response;
      setMessage(apiResponseMessage(response, "Request completed successfully."));
    } catch (error) { setMessage(apiErrorMessage(error)); setBusy(false); }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-stone-50 px-4 py-10">
      <div className="absolute -left-40 -top-48 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-48 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <Card className="border-stone-200/80 shadow-2xl shadow-stone-900/5">
          <CardHeader className="space-y-2 pb-5">
            <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="h-5 w-5" /></div>
            <CardTitle className="text-2xl">{text[0]}</CardTitle>
            <CardDescription>{text[1]}</CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "callback" ? <div className="flex items-center gap-3 rounded-lg bg-muted p-4 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Finishing authentication…</div> : (
              <form className="grid gap-4" onSubmit={submit}>
                {mode === "activate" && <><input type="hidden" name="activationCode" value={activationCode()} /><Field label="First name" name="firstName" autoComplete="given-name" /><Field label="Last name" name="lastName" autoComplete="family-name" /></>}
                {mode === "signup" && <><Field label="Full name" name="name" placeholder="Jordan Davis" /><Field label="Work email" name="email" type="email" placeholder="you@company.com" /></>}
                {["signup", "activate"].includes(mode) && <Field label="Password" name="password" type="password" minLength={8} />}
                {mode === "activate" && <Field label="Confirm password" name="confirmPassword" type="password" minLength={8} />}
                {mode === "recover" && <Field label="Email" name="email" type="email" placeholder="you@company.com" />}
                {mode === "reset" && <><Field label="Email" name="email" type="email" /><Field label="Reset token" name="token" defaultValue={query().get("token") || query().get("code") || ""} /><Field label="New password" name="password" type="password" minLength={8} /></>}
                {mode === "login" && <p className="rounded-lg border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">Continue securely with your organization’s SELISE Blocks identity.</p>}
                <Button className="mt-1 w-full" disabled={busy || (mode === "activate" && !activationReady)}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{text[2]}{!busy && <ArrowRight className="h-4 w-4" />}</Button>
              </form>
            )}
            {message && <p className="mt-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary" role="status">{message}</p>}
            {mode !== "callback" && <div className="mt-5 flex justify-between text-sm">{mode === "login" ? <><button className="text-primary hover:underline" onClick={() => switchMode("signup")}>Create account</button><button className="text-primary hover:underline" onClick={() => switchMode("recover")}>Forgot password?</button></> : <button className="text-primary hover:underline" onClick={() => switchMode("login")}>Back to sign in</button>}</div>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return <div className="field"><Label htmlFor={props.name}>{label}</Label><Input id={props.name} required {...props} /></div>;
}
