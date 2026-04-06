import { useEffect, useMemo, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { authApi, getApiErrorMessage } from "../utils/api";

const ROLE_STORAGE_KEY = "selectedRole";

function roleLabel(role, t) {
  return role === "issuer" ? t("issuer") : t("student");
}

export default function Login() {
  const navigate = useNavigate();
  const { login: setSession } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(localStorage.getItem(ROLE_STORAGE_KEY) || "student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(() => t("loginAs", { role: roleLabel(selectedRole, t) }), [selectedRole, t]);

  useEffect(() => {
    localStorage.setItem(ROLE_STORAGE_KEY, selectedRole);
  }, [selectedRole]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (import.meta.env.DEV) {
        console.log("[Login] POST", "/api/auth/login", {
          email,
          role: selectedRole,
        });
      }

      const response = await authApi.login({ email, password, role: selectedRole });
      const data = response?.data;

      if (!data?.success) {
        setError(data?.message || t("loginFailed"));
        return;
      }

      if (!data?.user || !data?.token) {
        throw new Error(t("loginFailed"));
      }

      const ok = setSession(data.user, data.token);
      if (!ok) {
        throw new Error("Unable to initialize session");
      }

      if (data.role === "issuer") {
        navigate("/issuer-dashboard", { replace: true });
        return;
      }

      if (data.role === "student") {
        navigate("/student-dashboard", { replace: true });
        return;
      }

      navigate(data.user.dashboardRoute || "/login", { replace: true });
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">{t("secureAccess")}</p>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-blue-100">{t("useRegisteredCredentials")}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/25 bg-white/10 p-1 text-sm text-white">
          <button
            type="button"
            className={`min-h-11 rounded-xl px-3 py-2 transition ${
              selectedRole === "issuer" ? "bg-white text-indigo-700" : "hover:bg-white/20"
            }`}
            onClick={() => setSelectedRole("issuer")}
          >
            {t("issuer")}
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-xl px-3 py-2 transition ${
              selectedRole === "student" ? "bg-white text-indigo-700" : "hover:bg-white/20"
            }`}
            onClick={() => setSelectedRole("student")}
          >
            {t("student")}
          </button>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-red-300/70 bg-red-100/95 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="email">{t("email")}</label>
            <input
              id="email"
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                placeholder={t("enterPassword")}
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
            {loading ? t("signingIn") : t("login")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-blue-100">
          {t("newUser")}{" "}
          <Link to="/register" className="font-semibold text-white underline decoration-white/70 underline-offset-4">{t("register")}</Link>
        </p>
        <p className="mt-2 text-center text-xs text-blue-100">
          {t("wrongRole")}{" "}
          <Link to="/" className="font-semibold text-white underline decoration-white/70 underline-offset-4">{t("chooseRoleAgain")}</Link>
        </p>
        <p className="mt-2 text-center text-xs text-blue-100">
          {t("adminAccess")}{" "}
          <Link to="/admin-login" className="font-semibold text-white underline decoration-white/70 underline-offset-4">{t("openAdminLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
