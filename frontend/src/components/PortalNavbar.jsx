import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../context/LanguageContext";
import { getPublicPortalCopy } from "../translations/publicPortal";

function NavLink({ to, label, pathname, onClick }) {
  const isActive = pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition lg:w-auto ${
        isActive ? "bg-[#0B5ED7] text-white shadow-sm" : "text-slate-700 hover:bg-slate-100 hover:text-[#0A3D62]"
      }`}
    >
      {label}
    </Link>
  );
}

export default function PortalNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const copy = getPublicPortalCopy(language);
  const links = [
    { to: "/", label: copy.home },
    { to: "/verify", label: copy.verifyCertificate },
    { to: "/login", label: copy.login },
    { to: "/register", label: copy.register },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1 lg:flex-none">
          <Logo compact={pathname !== "/"} />
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <NavLink key={link.to} {...link} pathname={pathname} />
            ))}
          </nav>
          <LanguageSwitcher light className="ml-2" />
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-sm lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <LanguageSwitcher light className="w-full justify-between gap-3" />
            <nav className="flex flex-col gap-2">
              {links.map((link) => (
                <NavLink key={link.to} {...link} pathname={pathname} onClick={() => setMenuOpen(false)} />
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
