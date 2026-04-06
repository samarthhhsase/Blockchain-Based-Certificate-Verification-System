import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role, redirectTo = "/login" }) {
  const { user, isAuthenticated, isAuthChecking } = useAuth();

  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-100 backdrop-blur">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          Checking session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return <div className="animate-fade-in-up">{children}</div>;
}
