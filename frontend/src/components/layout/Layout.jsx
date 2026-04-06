import { useEffect, useMemo, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSwitcher from "../LanguageSwitcher";
import DashboardShell from "./DashboardShell";
import Sidebar from "./Sidebar";

export default function Layout({ role, userName, sidebarItems, children }) {
  const { t } = useLanguage();
  const formattedRole = role ? t(role) : "User";
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const initials = useMemo(
    () =>
      (userName || "U")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [userName]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <DashboardShell
      backgroundClassName="bg-slate-100 p-4 transition-colors dark:bg-slate-950 md:p-6"
      sidebarWidth="288px"
      sidebar={<Sidebar title={`${formattedRole} ${t("workspace")}`} items={sidebarItems} />}
      header={
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("welcomeBack")}</p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{userName || t("dashboard")}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LanguageSwitcher light />
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                aria-label={t("toggleTheme")}
              >
                {theme === "dark" ? <FaSun /> : <FaMoon />}
              </button>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="inline-flex w-fit items-center rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {formattedRole}
                </span>
              </div>
            </div>
          </div>
        </div>
      }
      contentClassName="dashboard-content"
    >
      {children}
    </DashboardShell>
  );
}
