import { ArrowLeft, ArrowRight, Award, BookOpenCheck, Home, MapPinOff, ShieldCheck } from "lucide-react";
import { useT } from "../../lib/i18n/LocalizationProvider";

export function NotFoundPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else onNavigate("/");
  }

  return <div className="not-found-page">
    <div className="not-found-grid" aria-hidden="true" />
    <div className="not-found-orbit" aria-hidden="true"><i /><i /><i /></div>

    <header className="not-found-header">
      <a className="not-found-brand" href="/login"><img src="/complitrack-logo.svg" alt="" /><span>{t("app.name")}</span></a>
      <span><ShieldCheck size={15} /> {t("notFound.secure")}</span>
    </header>

    <div className="not-found-content">
      <div className="not-found-code" aria-hidden="true"><span>4</span><span className="not-found-zero"><MapPinOff size={44} /></span><span>4</span></div>
      <span className="not-found-kicker">{t("notFound.kicker")}</span>
      <h1>{t("notFound.heading")}</h1>
      <p>{t("notFound.description")}</p>

      <div className="not-found-actions">
        <button className="primary-button" onClick={() => onNavigate("/")}><Home size={17} /> {t("notFound.home")}</button>
        <button className="not-found-secondary" onClick={goBack}><ArrowLeft size={17} /> {t("notFound.back")}</button>
      </div>

      <div className="not-found-suggestions">
        <span>{t("notFound.explore")}</span>
        <div>
          <button onClick={() => onNavigate("/courses")}><BookOpenCheck size={15} /> {t("nav.courses")} <ArrowRight size={14} /></button>
          <button onClick={() => onNavigate("/certificates")}><Award size={15} /> {t("nav.certificates")} <ArrowRight size={14} /></button>
        </div>
      </div>
    </div>

    <footer className="not-found-footer"><span>COMPLITRACK // 404</span><span>{t("notFound.footer")}</span></footer>
  </div>;
}
