import { Globe2 } from "lucide-react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./dropdown-menu";

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { language, setLanguage, t } = useT();
  const shortLabel = language === "de-DE" ? "DE" : "EN";

  return <DropdownMenu>
    <DropdownMenuTrigger className={`language-trigger ${dark ? "language-trigger-dark" : ""}`} aria-label={t("language.label")}>
      <Globe2 size={16} /><span>{shortLabel}</span>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="language-menu">
      <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
        <DropdownMenuRadioItem value="en-US"><span className="language-option"><strong>EN</strong><span>{t("language.english")}</span></span></DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="de-DE"><span className="language-option"><strong>DE</strong><span>{t("language.german")}</span></span></DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
