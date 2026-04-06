import { NavLink } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useDashboardScroll } from "../layout/DashboardShell";

const linkClassName = ({ isActive }) =>
  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
    isActive
      ? "bg-emerald-400 text-slate-950 shadow-lg"
      : "text-slate-200 hover:bg-white/10 hover:text-white"
  }`;

export default function AdminSidebar({ items }) {
  const { t } = useLanguage();
  const { scrollToTop } = useDashboardScroll();

  return (
    <div className="flex h-full w-full flex-col rounded-[28px] border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur">
      <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/20 via-slate-900 to-cyan-400/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">{t("admin")}</p>
        <h2 className="mt-3 font-serif text-2xl font-bold text-white">{t("appTitle")}</h2>
        <p className="mt-2 text-sm text-slate-300">Manage issuers, students, and system certificates from one workspace.</p>
      </div>

      <nav className="mt-6 space-y-2 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
        {items.map((item) => (
          <NavLink key={item.label} to={item.href} onClick={() => scrollToTop("auto")} className={linkClassName}>
            <item.icon className="text-base" />
            <span>{item.translationKey ? t(item.translationKey) : item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
