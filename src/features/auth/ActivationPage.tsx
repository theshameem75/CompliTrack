import { ArrowLeft, ArrowRight, Award, Check, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { blocksClient } from "../../lib/blocks/client";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";

type ActivationStage = "invalid" | "ready" | "success" | "validating";

export function ActivationPage({ code, language, onNavigate }: { code?: string; language?: string; onNavigate: (path: string) => void }) {
  const { setLanguage, t } = useT();
  const [stage, setStage] = useState<ActivationStage>("validating");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "", confirmPassword: "" });

  useEffect(() => {
    if (language) setLanguage(language);
  }, [language, setLanguage]);

  useEffect(() => {
    let active = true;
    if (!code) {
      setError(t("activate.missingCode"));
      setStage("invalid");
      return;
    }

    setStage("validating");
    blocksClient.auth.validateActivation({ code })
      .then((response) => {
        if (!active) return;
        const failure = activationFailure(response);
        if (failure) {
          setError(failure);
          setStage("invalid");
          return;
        }
        setStage("ready");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(errorMessage(caught, t("activate.invalidDescription")));
        setStage("invalid");
      });

    return () => { active = false; };
  }, [code, t]);

  const passwordChecks = useMemo(() => [
    { label: t("activate.passwordLength"), met: form.password.length >= 8 },
    { label: t("activate.passwordCase"), met: /[a-z]/.test(form.password) && /[A-Z]/.test(form.password) },
    { label: t("activate.passwordNumber"), met: /\d/.test(form.password) }
  ], [form.password, t]);
  const passwordsMatch = Boolean(form.confirmPassword) && form.password === form.confirmPassword;
  const canSubmit = Boolean(code && form.firstName.trim() && form.lastName.trim() && passwordChecks.every((check) => check.met) && passwordsMatch && !pending);

  async function activateAccount() {
    if (!canSubmit || !code) return;
    setError(undefined);
    setPending(true);
    try {
      const response = await blocksClient.auth.activate({
        code,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password
      });
      const failure = activationFailure(response);
      if (failure) throw new Error(failure);
      setStage("success");
    } catch (caught) {
      setError(errorMessage(caught, t("activate.failed")));
    } finally {
      setPending(false);
    }
  }

  return <div className="activation-screen">
    <section className="activation-visual" aria-label="CompliTrack account activation">
      <div className="activation-grid" aria-hidden="true" />
      <header className="activation-brand-header">
        <a className="auth-wordmark" href="/login"><img src="/complitrack-logo.svg" alt="" /><span>{t("app.name")}</span></a>
        <span className="activation-invite-badge"><Sparkles size={14} /> {t("activate.invited")}</span>
      </header>

      <div className="activation-story">
        <span className="activation-kicker"><ShieldCheck size={16} /> {t("activate.secureSetup")}</span>
        <h1>{t("activate.visualTitle")}</h1>
        <p>{t("activate.visualSubtitle")}</p>
        <div className="activation-steps">
          <div><span><Check size={16} /></span><strong>{t("activate.stepIdentity")}</strong><small>{t("activate.stepIdentityDescription")}</small></div>
          <div><span><KeyRound size={16} /></span><strong>{t("activate.stepPassword")}</strong><small>{t("activate.stepPasswordDescription")}</small></div>
          <div><span><Award size={16} /></span><strong>{t("activate.stepReady")}</strong><small>{t("activate.stepReadyDescription")}</small></div>
        </div>
      </div>

      <footer className="activation-security-note"><LockKeyhole size={14} /> {t("activate.securityNote")}</footer>
    </section>

    <section className="activation-access">
      <div className="activation-card">
        {stage === "validating" ? <div className="activation-state-card"><span className="spinner" /><h2>{t("activate.validating")}</h2><p>{t("activate.validatingDescription")}</p></div> : null}

        {stage === "invalid" ? <div className="activation-state-card activation-invalid"><span className="activation-state-icon"><KeyRound size={24} /></span><span className="eyebrow">{t("activate.linkIssue")}</span><h2>{t("activate.invalid")}</h2><p>{error || t("activate.invalidDescription")}</p><button className="primary-button activation-primary" onClick={() => onNavigate("/login")}><ArrowLeft size={17} /> {t("auth.back")}</button></div> : null}

        {stage === "success" ? <div className="activation-state-card activation-success"><span className="activation-state-icon"><CheckCircle2 size={28} /></span><span className="eyebrow">{t("activate.complete")}</span><h2>{t("activate.success")}</h2><p>{t("activate.successDescription")}</p><button className="primary-button activation-primary" onClick={() => onNavigate("/login")}>{t("activate.continue")} <ArrowRight size={17} /></button></div> : null}

        {stage === "ready" ? <>
          <div className="activation-heading">
            <span className="eyebrow">{t("activate.accountSetup")}</span>
            <h2>{t("activate.title")}</h2>
            <p>{t("activate.subtitle")}</p>
          </div>

          <form className="activation-form" onSubmit={(event) => { event.preventDefault(); void activateAccount(); }}>
            <div className="activation-name-grid">
              <label className="form-field"><span>{t("activate.firstName")}</span><input autoComplete="given-name" autoFocus placeholder="Afia" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
              <label className="form-field"><span>{t("activate.lastName")}</span><input autoComplete="family-name" placeholder="Preety" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
            </div>

            <label className="form-field"><span>{t("activate.password")}</span><span className="password-input"><input autoComplete="new-password" placeholder={t("activate.passwordPlaceholder")} required type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button aria-label={showPassword ? t("activate.hidePassword") : t("activate.showPassword")} type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>

            <div className="password-requirements">{passwordChecks.map((check) => <span className={check.met ? "met" : ""} key={check.label}><i>{check.met ? <Check size={11} /> : null}</i>{check.label}</span>)}</div>

            <label className="form-field"><span>{t("activate.confirmPassword")}</span><span className="password-input"><input autoComplete="new-password" placeholder={t("activate.confirmPlaceholder")} required type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></span></label>
            {form.confirmPassword && !passwordsMatch ? <small className="field-error">{t("activate.passwordMismatch")}</small> : null}

            {error ? <Alert tone="error">{error}</Alert> : null}
            <button className="primary-button activation-primary" disabled={!canSubmit} type="submit"><span>{pending ? t("activate.activating") : t("activate.createAccount")}</span>{pending ? <span className="button-spinner" /> : <ArrowRight size={18} />}</button>
          </form>
          <p className="activation-terms">{t("activate.terms")}</p>
        </> : null}
      </div>
    </section>
  </div>;
}

function activationFailure(response: Record<string, unknown>): string | undefined {
  const data = typeof response.data === "object" && response.data ? response.data as Record<string, unknown> : undefined;
  const valid = response.valid ?? response.isValid ?? response.IsValid ?? data?.valid ?? data?.isValid ?? data?.IsValid;
  const succeeded = response.success ?? response.succeeded ?? data?.success ?? data?.succeeded;
  const protocolError = response.error_description ?? response.error ?? data?.error_description ?? data?.error;
  if (typeof protocolError === "string" && protocolError) return protocolError;
  if (valid === false || succeeded === false) {
    const message = response.message ?? data?.message;
    return typeof message === "string" && message ? message : "This activation link is invalid or has expired.";
  }
  return undefined;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
