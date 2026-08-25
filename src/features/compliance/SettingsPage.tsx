import { Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { saveSettings } from "./complianceApi";
import type { ComplianceSetting } from "./complianceApi";
import { useComplianceData, useRefreshCompliance } from "./useComplianceData";
import { PageHeader } from "../../shared/ui/PageHeader";

const defaults: ComplianceSetting = { organizationId: "default", gracePeriodDays: 7, autoAssignOnRoleChange: true, managerVerificationRequired: true, reminderDays: [60, 30, 7], defaultLanguage: "en-US", complianceLabel: "Compliant", restrictedRoleSlug: "noncompliant-restricted" };

export function SettingsPage() {
  const { settings } = useComplianceData();
  const refresh = useRefreshCompliance();
  const [form, setForm] = useState<ComplianceSetting>(defaults);
  useEffect(() => { if (settings.data?.[0]) setForm({ ...defaults, ...settings.data[0] }); }, [settings.data]);
  const save = useMutation({ mutationFn: () => saveSettings(form), onSuccess: () => void refresh() });
  return <section>
    <PageHeader title="Compliance settings" subtitle="Organization-wide policy, localization, renewal, and access controls." actions={<button className="primary-button" disabled={save.isPending} onClick={() => save.mutate()}><Save size={16} /> Save settings</button>} />
    <div className="settings-layout"><div className="panel"><div className="panel-title"><Settings2 size={17} /> Policy</div>
      <label className="form-field"><span>Grace period after expiry (days)</span><input type="number" value={form.gracePeriodDays} onChange={(event) => setForm({ ...form, gracePeriodDays: Number(event.target.value) })} /></label>
      <label className="toggle-row"><span><strong>Auto-assign on role change</strong><small>Reconcile mandatory assignments when IAM roles change.</small></span><input type="checkbox" checked={form.autoAssignOnRoleChange} onChange={(event) => setForm({ ...form, autoAssignOnRoleChange: event.target.checked })} /></label>
      <label className="toggle-row"><span><strong>Manager verification required</strong><small>Insert the verification stage before certificate issuance.</small></span><input type="checkbox" checked={form.managerVerificationRequired} onChange={(event) => setForm({ ...form, managerVerificationRequired: event.target.checked })} /></label>
    </div><div className="panel"><div className="panel-title">Reminders & localization</div>
      <label className="form-field"><span>Expiry reminder days</span><input value={(form.reminderDays ?? []).join(", ")} onChange={(event) => setForm({ ...form, reminderDays: event.target.value.split(",").map(Number).filter(Number.isFinite) })} /></label>
      <label className="form-field"><span>Default language</span><select value={form.defaultLanguage} onChange={(event) => setForm({ ...form, defaultLanguage: event.target.value })}><option value="en-US">English</option><option value="ar-AE">Arabic</option><option value="es-ES">Spanish</option></select></label>
      <label className="form-field"><span>Localized compliant label</span><input value={form.complianceLabel} onChange={(event) => setForm({ ...form, complianceLabel: event.target.value })} /></label>
      <label className="form-field"><span>Restricted role slug</span><input value={form.restrictedRoleSlug} onChange={(event) => setForm({ ...form, restrictedRoleSlug: event.target.value })} /></label>
    </div></div>
    <div className="alert alert-info">Renewal reminders are evaluated at 60, 30, and 7 days. Production delivery requires a scheduled runner; the browser app exposes the same sweep logic for manual checks.</div>
  </section>;
}
