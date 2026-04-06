import { useLanguage } from "../context/LanguageContext";
import { getPublicPortalCopy } from "../translations/publicPortal";

export default function LanguageSwitcher({ className = "", light = false }) {
  const { language, setLanguage } = useLanguage();
  const copy = getPublicPortalCopy(language);
  const languageOptions = [
    { value: "en", label: copy.languages.en },
    { value: "hi", label: copy.languages.hi },
    { value: "mr", label: copy.languages.mr },
  ];
  const themeClasses = light
    ? "border-slate-200 bg-white text-slate-700"
    : "border-white/25 bg-white/15 text-white";

  return (
    <label className={`flex min-w-0 items-center gap-2 text-sm font-medium ${light ? "text-slate-700" : "text-white"} ${className}`.trim()}>
      <span className="shrink-0">{copy.language}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className={`min-w-0 max-w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-cyan-400 ${themeClasses}`}
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
