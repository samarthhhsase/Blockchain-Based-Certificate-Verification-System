import { FaArrowRight, FaCheckCircle, FaGraduationCap, FaLink, FaShieldAlt, FaUniversity } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import PortalNavbar from "../components/PortalNavbar";
import { useLanguage } from "../context/LanguageContext";
import { getPublicPortalCopy } from "../translations/publicPortal";

const ROLE_STORAGE_KEY = "selectedRole";

export default function RoleSelection() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const copy = getPublicPortalCopy(language);

  const selectRole = (role) => {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    navigate("/login", { replace: true });
  };

  return (
    <div className="gov-page-bg min-h-screen">
      <PortalNavbar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
        <section className="gov-hero-panel gov-grid-pattern animate-fade-in-up overflow-hidden rounded-[28px] px-3 py-3 shadow-[0_24px_60px_rgba(10,61,98,0.28)] sm:rounded-[32px] sm:px-6 sm:py-6">
          <div className="mx-auto max-w-4xl rounded-[24px] bg-white px-4 py-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.14)] sm:rounded-[28px] sm:px-8 sm:py-10 lg:px-10 lg:py-14">
            <div className="flex justify-center">
              <Logo />
            </div>
            <p className="mt-6 inline-flex max-w-full rounded-full bg-blue-50 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B5ED7] sm:mt-8 sm:px-4 sm:text-sm sm:tracking-[0.18em]">
              {copy.heroBadge}
            </p>
            <h1 className="mt-4 break-words text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-6xl">AaplaPramaanPatra</h1>
            <p className="mt-4 text-base font-semibold text-slate-700 sm:text-xl lg:text-2xl">
              {copy.heroSubtitle}
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              {copy.heroDescription}
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to="/verify"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0B5ED7] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0A3D62] sm:w-auto"
              >
                {copy.verifyCertificate}
                <FaArrowRight />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 sm:w-auto"
              >
                {copy.login}
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { icon: <FaCheckCircle />, title: copy.featureTamperTitle, body: copy.featureTamperBody },
            { icon: <FaShieldAlt />, title: copy.featureSecurityTitle, body: copy.featureSecurityBody },
            { icon: <FaLink />, title: copy.featureInstantTitle, body: copy.featureInstantBody },
          ].map((feature) => (
            <div key={feature.title} className="gov-card h-full p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-lg text-[#0B5ED7] sm:h-12 sm:w-12 sm:text-xl">
                {feature.icon}
              </div>
              <h2 className="mt-4 text-base font-bold text-[#0A3D62] sm:text-lg">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
            </div>
          ))}
        </section>

        <section className="gov-card p-5 sm:p-8">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 text-center sm:text-left">
            <p className="gov-section-title">{copy.roleAccess}</p>
            <h2 className="text-2xl font-black tracking-tight text-[#0A3D62] sm:text-3xl">{t("chooseRole")}</h2>
            <p className="text-sm text-slate-600">{copy.roleAccessDescription}</p>
          </div>

          <div className="mt-8 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => selectRole("issuer")}
              className="group rounded-3xl border border-slate-200 bg-[#F5F7FA] p-5 text-left transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white sm:p-6"
            >
              <FaUniversity className="mb-4 text-2xl text-[#0B5ED7]" />
              <p className="text-xl font-bold text-[#0A3D62]">{t("issuer")}</p>
              <p className="mt-2 text-sm text-slate-600">{copy.issuerRoleDescription}</p>
            </button>

            <button
              type="button"
              onClick={() => selectRole("student")}
              className="group rounded-3xl border border-slate-200 bg-[#F5F7FA] p-5 text-left transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white sm:p-6"
            >
              <FaGraduationCap className="mb-4 text-2xl text-[#0B5ED7]" />
              <p className="text-xl font-bold text-[#0A3D62]">{t("student")}</p>
              <p className="mt-2 text-sm text-slate-600">{copy.studentRoleDescription}</p>
            </button>
          </div>

          <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="mt-1 text-[#0B5ED7]" />
              <div>
                <p className="font-semibold text-[#0A3D62]">{copy.adminWorkspacePrompt}</p>
                <p className="text-sm text-slate-600">{copy.adminWorkspaceDescription}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/admin-login"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-200 bg-[#28A745] px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {t("adminLogin")}
              </Link>
              <Link
                to="/admin-register"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {t("adminRegister")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
