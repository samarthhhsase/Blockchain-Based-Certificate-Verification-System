import { useState } from "react";
import { FaEye, FaEyeSlash, FaShieldHalved } from "react-icons/fa6";
import { Link, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { authApi, getApiErrorMessage } from "../utils/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        login_id: identifier.trim(),
        password: password.trim(),
      };
      const { data } = await authApi.adminLogin(payload);
      const authUser = data?.user || data?.admin;

      if (!data?.success || !authUser || !data?.token) {
        throw new Error(data?.message || "Admin login failed");
      }

      const ok = login(authUser, data.token);
      if (!ok) {
        throw new Error("Unable to initialize admin session");
      }

      navigate(data.redirectTo || "/admin-dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#34d399,_transparent_25%),radial-gradient(circle_at_bottom_right,_#22d3ee,_transparent_20%),linear-gradient(135deg,_#020617,_#0f172a_55%,_#134e4a)] px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-white shadow-2xl backdrop-blur">
          <div className="mb-6 flex justify-end">
            <LanguageSwitcher />
          </div>
          <div className="inline-flex items-center gap-3 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
            <FaShieldHalved />
            {t("secureAdminEntry")}
          </div>
          <h1 className="mt-6 font-serif text-5xl font-bold leading-tight">Oversee the full certificate lifecycle from one panel.</h1>
          <p className="mt-5 max-w-xl text-base text-slate-200">
            Sign in with the dedicated admin `login_id` or email and password to access the admin workspace without affecting issuer or student login flows.
          </p>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white p-8 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">{t("adminLogin")}</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-slate-950">{t("adminWorkspace")}</h2>
          <p className="mt-2 text-sm text-slate-600">Use your admin login ID or email from the `admins` table.</p>

          {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="identifier">
                {t("loginIdOrEmail")}
              </label>
              <input
                id="identifier"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="admin-login or admin@school.edu"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
                {t("password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("enterAdminPassword")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? t("signingIn") : t("openAdminWorkspace")}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Issuer or student account?{" "}
            <Link to="/login" className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4">
              {t("useStandardLogin")}
            </Link>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {t("needNewAdminAccount")}{" "}
            <Link to="/admin-register" className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4">
              {t("registerAdmin")}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
