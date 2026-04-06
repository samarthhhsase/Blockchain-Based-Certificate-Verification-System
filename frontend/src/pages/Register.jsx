import { useEffect, useMemo, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useLanguage } from "../context/LanguageContext";
import { authApi, getApiErrorMessage } from "../utils/api";

const ROLE_STORAGE_KEY = "selectedRole";

function roleLabel(role, t) {
  return role === "issuer" ? t("issuer") : t("student");
}

export default function Register() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: localStorage.getItem(ROLE_STORAGE_KEY) || "student",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const title = useMemo(() => t("registerAs", { role: roleLabel(form.role, t) }), [form.role, t]);

  useEffect(() => {
    localStorage.setItem(ROLE_STORAGE_KEY, form.role);
  }, [form.role]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await authApi.register(form);
      if (!data?.success) {
        throw new Error(data?.message || t("registrationFailed"));
      }

      setSuccess(t("registrationSuccessfulRedirecting"));
      setTimeout(() => navigate("/login", { replace: true }), 700);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-gradient-bg flex min-h-screen items-center justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-md animate-fade-in-up rounded-3xl border border-white/25 bg-white/15 p-5 shadow-soft backdrop-blur-xl sm:p-8">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher className="w-full justify-end sm:w-auto" />
        </div>

        <div className="mb-6 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">{t("createAccount")}</p>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-blue-100">{t("joinWithRole")}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/25 bg-white/10 p-1 text-sm text-white">
          <button
            type="button"
            className={`min-h-11 rounded-xl px-3 py-2 transition ${form.role === "issuer" ? "bg-white text-indigo-700" : "hover:bg-white/20"}`}
            onClick={() => updateField("role", "issuer")}
          >
            {t("issuer")}
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-xl px-3 py-2 transition ${form.role === "student" ? "bg-white text-indigo-700" : "hover:bg-white/20"}`}
            onClick={() => updateField("role", "student")}
          >
            {t("student")}
          </button>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-red-300/70 bg-red-100/95 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="mb-4 rounded-xl border border-emerald-300/70 bg-emerald-100/95 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="name">{t("fullName")}</label>
            <input
              id="name"
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
              placeholder={t("enterFullName")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="email">{t("email")}</label>
            <input
              id="email"
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="password">{t("password")}</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
                minLength={6}
                placeholder={t("createStrongPassword")}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={t("password")}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            className="min-h-12 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:opacity-95"
            type="submit"
            disabled={loading}
          >
            {loading ? t("creatingAccount") : t("register")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-blue-100">
          {t("alreadyHaveAccount")}{" "}
          <Link to="/login" className="font-semibold text-white underline decoration-white/70 underline-offset-4">{t("login")}</Link>
        </p>
      </div>
    </div>
  );
}
