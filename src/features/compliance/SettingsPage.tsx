import { Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { saveSettings } from "./complianceApi";
import type { ComplianceSetting } from "./complianceApi";
import { useComplianceData, useRefreshCompliance } from "./useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";
import { useT } from "../../lib/i18n/LocalizationProvider";

const defaults: ComplianceSetting = { organizationId: "default", gracePeriodDays: 7, autoAssignOnRoleChange: true, managerVerificationRequired: true, reminderDays: [60, 30, 7], defaultLanguage: "en-US", complianceLabel: "Compliant", restrictedRoleSlug: "noncompliant-restricted" };

export function SettingsPage() {
  const { t } = useT();
  const { settings } = useComplianceData();
  const refresh = useRefreshCompliance();
  const [form, setForm] = useState<ComplianceSetting>(defaults);
  useEffect(() => { if (settings.data?.[0]) setForm({ ...defaults, ...settings.data[0] }); }, [settings.data]);
  const save = useMutation({ mutationFn: () => saveSettings(form), onSuccess: () => void refresh() });
  return <section>
    <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} actions={<button className="primary-button" disabled={save.isPending} onClick={() => save.mutate()}><Save size={16} /> {t("settings.save")}</button>} />
    <div className="settings-layout"><div className="panel"><div className="panel-title"><Settings2 size={17} /> {t("settings.policy")}</div>
      <label className="form-field"><span>{t("settings.gracePeriod")}</span><input type="number" value={form.gracePeriodDays} onChange={(event) => setForm({ ...form, gracePeriodDays: Number(event.target.value) })} /></label>
      <label className="toggle-row"><span><strong>{t("settings.autoAssign")}</strong><small>{t("settings.autoAssignDescription")}</small></span><input type="checkbox" checked={form.autoAssignOnRoleChange} onChange={(event) => setForm({ ...form, autoAssignOnRoleChange: event.target.checked })} /></label>
      <label className="toggle-row"><span><strong>{t("settings.managerVerification")}</strong><small>{t("settings.managerVerificationDescription")}</small></span><input type="checkbox" checked={form.managerVerificationRequired} onChange={(event) => setForm({ ...form, managerVerificationRequired: event.target.checked })} /></label>
    </div><div className="panel"><div className="panel-title">{t("settings.remindersLocalization")}</div>
      <label className="form-field"><span>{t("settings.reminderDays")}</span><input value={(form.reminderDays ?? []).join(", ")} onChange={(event) => setForm({ ...form, reminderDays: event.target.value.split(",").map(Number).filter(Number.isFinite) })} /></label>
      <label className="form-field"><span>{t("settings.defaultLanguage")}</span><select value={form.defaultLanguage} onChange={(event) => setForm({ ...form, defaultLanguage: event.target.value })}><option value="en-US">{t("language.english")}</option><option value="de-DE">{t("language.german")}</option></select></label>
      <label className="form-field"><span>{t("settings.compliantLabel")}</span><input value={form.complianceLabel} onChange={(event) => setForm({ ...form, complianceLabel: event.target.value })} /></label>
      <label className="form-field"><span>{t("settings.restrictedRole")}</span><input value={form.restrictedRoleSlug} onChange={(event) => setForm({ ...form, restrictedRoleSlug: event.target.value })} /></label>
    </div></div>
    <div className="alert alert-info">{t("settings.reminderNote")}</div>
  </section>;
}
