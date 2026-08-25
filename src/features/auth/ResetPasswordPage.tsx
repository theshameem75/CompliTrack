import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { blocksClient } from "../../lib/blocks/client";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { LanguageSwitcher } from "../../shared/ui/LanguageSwitcher";

type ResetStage = "invalid" | "ready" | "success";

export function ResetPasswordPage({ code, language, onNavigate }: { code?: string; language?: string; onNavigate: (path: string) => void }) {
  const { setLanguage, t } = useT();
  const [stage, setStage] = useState<ResetStage>(code ? "ready" : "invalid");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (language) setLanguage(language);
  }, [language, setLanguage]);

  const passwordChecks = useMemo(() => [
    { label: t("activate.passwordLength"), met: password.length >= 8 },
    { label: t("activate.passwordCase"), met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: t("activate.passwordNumber"), met: /\d/.test(password) }
  ], [password, t]);
  const passwordsMatch = Boolean(confirmation) && password === confirmation;
  const canSubmit = Boolean(code && passwordChecks.every((check) => check.met) && passwordsMatch && !pending);

  async function resetPassword() {
    if (!canSubmit || !code) return;
    setError(undefined);
    setPending(true);
    try {
      const response = await blocksClient.auth.resetPassword({ code, password });
      const failure = resetFailure(response);
      if (failure) throw new Error(failure);
      setStage("success");
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      setError(errorMessage(caught, t("reset.failed")));
    } finally {
      setPending(false);
    }
  }

  return <div className="activation-screen">
    <section className="activation-visual reset-visual" aria-label="CompliTrack password recovery">
      <div className="activation-grid" aria-hidden="true" />
      <header className="activation-brand-header">
        <a className="auth-wordmark" href="/login"><img src="/complitrack-logo.svg" alt="" /><span>{t("app.name")}</span></a>
        <div className="public-language-actions"><span className="activation-invite-badge"><Sparkles size={14} /> {t("reset.recoveryMode")}</span><LanguageSwitcher dark /></div>
      </header>

      <div className="activation-story">
        <span className="activation-kicker"><ShieldCheck size={16} /> {t("reset.secureRecovery")}</span>
        <h1>{t("reset.visualTitle")}</h1>
        <p>{t("reset.visualSubtitle")}</p>
        <div className="activation-steps">
          <div><span><Check size={16} /></span><strong>{t("reset.stepLink")}</strong><small>{t("reset.stepLinkDescription")}</small></div>
          <div><span><KeyRound size={16} /></span><strong>{t("reset.stepPassword")}</strong><small>{t("reset.stepPasswordDescription")}</small></div>
          <div><span><RefreshCw size={16} /></span><strong>{t("reset.stepReturn")}</strong><small>{t("reset.stepReturnDescription")}</small></div>
        </div>
      </div>

      <footer className="activation-security-note"><LockKeyhole size={14} /> {t("activate.securityNote")}</footer>
    </section>

    <section className="activation-access">
      <div className="activation-card reset-card">
        {stage === "invalid" ? <div className="activation-state-card activation-invalid"><span className="activation-state-icon"><KeyRound size={24} /></span><span className="eyebrow">{t("reset.linkIssue")}</span><h2>{t("reset.invalid")}</h2><p>{t("reset.invalidDescription")}</p><button className="primary-button activation-primary" onClick={() => onNavigate("/login")}><ArrowLeft size={17} /> {t("auth.back")}</button></div> : null}

        {stage === "success" ? <div className="activation-state-card activation-success"><span className="activation-state-icon"><CheckCircle2 size={28} /></span><span className="eyebrow">{t("reset.complete")}</span><h2>{t("reset.success")}</h2><p>{t("reset.successDescription")}</p><button className="primary-button activation-primary" onClick={() => onNavigate("/login")}>{t("reset.continue")} <ArrowRight size={17} /></button></div> : null}

        {stage === "ready" ? <>
          <div className="activation-heading">
            <span className="eyebrow">{t("reset.accountSecurity")}</span>
            <h2>{t("reset.title")}</h2>
            <p>{t("reset.subtitle")}</p>
          </div>

          <form className="activation-form" onSubmit={(event) => { event.preventDefault(); void resetPassword(); }}>
            <label className="form-field"><span>{t("reset.newPassword")}</span><span className="password-input"><input autoComplete="new-password" autoFocus placeholder={t("activate.passwordPlaceholder")} required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} /><button aria-label={showPassword ? t("activate.hidePassword") : t("activate.showPassword")} type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>

            <div className="password-requirements">{passwordChecks.map((check) => <span className={check.met ? "met" : ""} key={check.label}><i>{check.met ? <Check size={11} /> : null}</i>{check.label}</span>)}</div>

            <label className="form-field"><span>{t("activate.confirmPassword")}</span><span className="password-input"><input autoComplete="new-password" placeholder={t("activate.confirmPlaceholder")} required type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></span></label>
            {confirmation && !passwordsMatch ? <small className="field-error">{t("activate.passwordMismatch")}</small> : null}

            {error ? <Alert tone="error">{error}</Alert> : null}
            <button className="primary-button activation-primary" disabled={!canSubmit} type="submit"><span>{pending ? t("reset.updating") : t("reset.updatePassword")}</span>{pending ? <span className="button-spinner" /> : <ArrowRight size={18} />}</button>
          </form>
          <div className="reset-session-note"><ShieldCheck size={16} /><span><strong>{t("reset.securityTitle")}</strong><small>{t("reset.securityDescription")}</small></span></div>
        </> : null}
      </div>
    </section>
  </div>;
}

function resetFailure(response: Record<string, unknown>): string | undefined {
  const data = typeof response.data === "object" && response.data ? response.data as Record<string, unknown> : undefined;
  const succeeded = response.success ?? response.succeeded ?? data?.success ?? data?.succeeded;
  const protocolError = response.error_description ?? response.error ?? data?.error_description ?? data?.error;
  if (typeof protocolError === "string" && protocolError) return protocolError;
  if (succeeded === false) {
    const message = response.message ?? data?.message;
    return typeof message === "string" && message ? message : "This reset link is invalid or has expired.";
  }
  return undefined;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
