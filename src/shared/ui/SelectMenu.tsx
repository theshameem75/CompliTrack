import { Check, ChevronDown } from "lucide-react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./dropdown-menu";

export type SelectOption = { label: string; value: string };

export function SelectMenu({ label, onChange, options, placeholder, value }: {
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
}) {
  const { t } = useT();
  const selected = options.find((option) => option.value === value);
  return <div className="form-field">
    <span>{label}</span>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label={label} className="select-trigger" type="button">
          <span className={selected ? "" : "select-placeholder"}>{selected?.label ?? placeholder ?? t("select.option")}</span>
          <ChevronDown size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="select-content">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

export function MultiSelectMenu({ label, onChange, options, placeholder, values }: {
  label: string;
  onChange: (values: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  values: string[];
}) {
  const { t } = useT();
  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...new Set([...values, value])] : values.filter((item) => item !== value));
  }

  const selected = options.filter((option) => values.includes(option.value));

  return <div className="form-field">
    <span>{label}</span>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label={label} className="select-trigger select-trigger-multiple" type="button">
          {selected.length ? <span className="select-values">{selected.map((option) => <span className="select-value-chip" key={option.value}>{option.label}</span>)}</span> : <span className="select-placeholder">{placeholder ?? t("select.roles")}</span>}
          <ChevronDown size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="select-content" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DropdownMenuLabel>{t("select.autoAssign")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => <DropdownMenuCheckboxItem
          checked={values.includes(option.value)}
          key={option.value}
          onCheckedChange={(checked) => toggle(option.value, checked === true)}
          onSelect={(event) => event.preventDefault()}
        >
          <span className="select-option-copy"><strong>{option.label}</strong><small>{roleDescription(option.value, t)}</small></span>
        </DropdownMenuCheckboxItem>)}
        {values.length ? <><DropdownMenuSeparator /><button className="select-clear" type="button" onClick={() => onChange([])}><Check size={14} /> {t("select.clear")}</button></> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

function roleDescription(value: string, t: ReturnType<typeof useT>["t"]) {
  const descriptions: Record<string, ReturnType<typeof t>> = {
    "employee": t("select.role.employee"),
    "manager": t("select.role.manager"),
    "hr-admin": t("select.role.hrAdmin"),
    "compliance-officer": t("select.role.complianceOfficer"),
    "trainer": t("select.role.trainer")
  };
  return descriptions[value] ?? t("select.role.default");
}
