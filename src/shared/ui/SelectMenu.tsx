import { Check, ChevronDown } from "lucide-react";
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

export function SelectMenu({ label, onChange, options, placeholder = "Select an option", value }: {
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
}) {
  const selected = options.find((option) => option.value === value);
  return <label className="form-field">
    <span>{label}</span>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="select-trigger" type="button">
          <span className={selected ? "" : "select-placeholder"}>{selected?.label ?? placeholder}</span>
          <ChevronDown size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="select-content">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </label>;
}

export function MultiSelectMenu({ label, onChange, options, placeholder = "Select roles", values }: {
  label: string;
  onChange: (values: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  values: string[];
}) {
  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...new Set([...values, value])] : values.filter((item) => item !== value));
  }

  return <label className="form-field">
    <span>{label}</span>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="select-trigger" type="button">
          <span className={values.length ? "select-summary" : "select-placeholder"}>
            {values.length ? `${values.length} role${values.length === 1 ? "" : "s"} selected` : placeholder}
          </span>
          <ChevronDown size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="select-content" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DropdownMenuLabel>Assign automatically to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => <DropdownMenuCheckboxItem
          checked={values.includes(option.value)}
          key={option.value}
          onCheckedChange={(checked) => toggle(option.value, checked === true)}
          onSelect={(event) => event.preventDefault()}
        >
          <span className="select-option-copy"><strong>{option.label}</strong><small>{roleDescription(option.value)}</small></span>
        </DropdownMenuCheckboxItem>)}
        {values.length ? <><DropdownMenuSeparator /><button className="select-clear" type="button" onClick={() => onChange([])}><Check size={14} /> Clear selection</button></> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  </label>;
}

function roleDescription(value: string) {
  const descriptions: Record<string, string> = {
    "employee": "All employees with this role",
    "manager": "People managers and team leads",
    "hr-admin": "HR administrators",
    "compliance-officer": "Compliance owners and reviewers",
    "trainer": "Course trainers and facilitators"
  };
  return descriptions[value] ?? "Users assigned to this role";
}
