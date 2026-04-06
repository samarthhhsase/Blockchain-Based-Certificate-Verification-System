import { FaShieldAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { getPublicPortalCopy } from "../translations/publicPortal";

export default function Logo({ compact = false, light = false, to = "/" }) {
  const { language } = useLanguage();
  const copy = getPublicPortalCopy(language);
  const subtitleClass = light ? "text-white/90" : "text-slate-600";
  const titleClass = light ? "text-white" : "text-[#0A3D62]";
  const iconWrapClass = light
    ? "bg-gradient-to-br from-[#0B5ED7] to-[#0A3D62] text-white shadow-lg shadow-blue-200/80"
    : "bg-gradient-to-br from-[#0B5ED7] to-[#0A3D62] text-white shadow-lg shadow-blue-200/80";

  return (
    <Link to={to} className="inline-flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconWrapClass}`}>
        <FaShieldAlt className="text-lg" />
      </div>
      <div className="min-w-0">
        <p className={`truncate text-lg font-extrabold tracking-tight ${titleClass}`}>AaplaPramaanPatra</p>
        {!compact ? (
          <p className={`text-xs font-medium ${subtitleClass}`}>{copy.brandSubtitle}</p>
        ) : null}
      </div>
    </Link>
  );
}
