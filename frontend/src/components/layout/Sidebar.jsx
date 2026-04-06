import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useDashboardScroll } from "./DashboardShell";

const linkBase =
  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200";

export default function Sidebar({ title, items }) {
  const location = useLocation();
  const { t } = useLanguage();
  const { scrollToTop } = useDashboardScroll();

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-slate-200 shadow-soft backdrop-blur-xl">
      <div className="mb-5 border-b border-white/10 pb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t("appTitle")}</p>
        <h2 className="mt-2 text-xl font-bold text-white">{title}</h2>
      </div>

      <nav className="flex flex-col gap-1.5 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
        {items.map((item) => {
          const active =
            item.href && location.pathname === item.href
              ? "bg-white/15 text-white"
              : "text-slate-300 hover:bg-white/10 hover:text-white";
          const label = item.translationKey ? t(item.translationKey) : item.label;

          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => item.onClick?.()}
                className={`${linkBase} ${active} w-full text-left`}
              >
                <item.icon className="text-base" />
                <span>{label}</span>
              </button>
            );
          }

          return (
            <Link key={item.label} to={item.href} onClick={() => scrollToTop("auto")} className={`${linkBase} ${active}`}>
              <item.icon className="text-base" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
