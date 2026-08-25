import { ArrowRight, CheckCircle2, LockKeyhole, Radio, ScanLine, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { isLoginConfigured } from "../../lib/blocks/config";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { LanguageSwitcher } from "../../shared/ui/LanguageSwitcher";

export function LoginPage({ returnTo }: { returnTo?: string }) {
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { t } = useT();
  const configured = isLoginConfigured();

  async function handleLogin() {
    setError(undefined);
    setPending(true);
    try {
      await login(returnTo);
    } catch (caught) {
      setError((caught as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-visual" aria-label="CompliTrack secure compliance platform">
        <div className="auth-grid" aria-hidden="true" />
        <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
        <div className="auth-orbit auth-orbit-two" aria-hidden="true" />

        <header className="auth-visual-header">
          <a className="auth-wordmark" href="/login" aria-label="CompliTrack home">
            <img src="/complitrack-logo.svg" alt="" />
            <span>{t("app.name")}</span>
          </a>
          <span className="system-online"><i /> {t("auth.systemOnline")}</span>
        </header>

        <div className="ascii-stage">
          <div className="ascii-kicker"><ScanLine size={15} /> {t("auth.controlNode")}</div>
          <pre className="ascii-logo" aria-label="CompliTrack">
{`  ____ ___  __  __ ____  _     ___
 / ___/ _ \\|  \\/  |  _ \\| |   |_ _|
| |  | | | | |\\/| | |_) | |    | |
| |__| |_| | |  | |  __/| |___ | |
 \\____\\___/|_|  |_|_|   |_____|___|

 _____ ____      _    ____ _  __
|_   _|  _ \\    / \\  / ___| |/ /
  | | | |_) |  / _ \\| |   | ' /
  | | |  _ <  / ___ \\ |___| . \\
  |_| |_| \\_\\/_/   \\_\\____|_|\\_\\`}
          </pre>
          <p>{t("auth.visualSubtitle")}</p>
        </div>

        <footer className="auth-visual-footer">
          <span><Radio size={14} /> {t("auth.signal")}</span>
          <span><ShieldCheck size={14} /> {t("auth.policy")}</span>
          <span>STG // 2026</span>
        </footer>
      </section>

      <section className="auth-access">
        <div className="auth-login-language"><LanguageSwitcher /></div>
        <div className="auth-access-inner">
          <div className="auth-mobile-brand">
            <img src="/complitrack-logo.svg" alt="" />
            <span>{t("app.name")}</span>
          </div>
          <div className="auth-card">
            <div className="auth-card-status"><LockKeyhole size={15} /> {t("auth.secureAccess")}</div>
            <div className="auth-heading">
              <span className="eyebrow">{t("auth.workspace")}</span>
              <h1>{t("auth.welcome")}</h1>
              <p>{t("auth.subtitle")}</p>
            </div>

            <div className="auth-trust-row">
              <span><CheckCircle2 size={15} /> {t("auth.training")}</span>
              <span><CheckCircle2 size={15} /> {t("auth.certificates")}</span>
              <span><CheckCircle2 size={15} /> {t("auth.accessControl")}</span>
            </div>

            {!configured ? (
              <Alert tone="warn">
                {t("auth.notConfigured")} <code>{window.location.origin}/login/callback</code>
              </Alert>
            ) : null}
            {error ? <Alert tone="error">{error}</Alert> : null}
            <button className="primary-button auth-submit" disabled={!configured || pending} onClick={handleLogin}>
              <span>{pending ? t("auth.redirecting") : t("auth.continue")}</span>
              <ArrowRight size={18} />
            </button>
            <p className="auth-footnote">{t("auth.footnote")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
