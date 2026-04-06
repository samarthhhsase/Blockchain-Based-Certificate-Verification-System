import { FaAddressCard, FaBookOpen, FaChartPie, FaUserGraduate, FaUserTie } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../layout/DashboardShell";
import { useAuth } from "../../context/AuthContext";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";

const navItems = [
  { label: "Dashboard", href: "/admin-dashboard", icon: FaChartPie, translationKey: "dashboard" },
  { label: "Manage Issuers", href: "/admin/issuers", icon: FaUserTie, translationKey: "manageIssuers" },
  { label: "Manage Students", href: "/admin/students", icon: FaUserGraduate, translationKey: "manageStudents" },
  { label: "Manage Certificates", href: "/admin/certificates", icon: FaBookOpen, translationKey: "manageCertificates" },
  { label: "Profile / Settings", href: "/admin-dashboard", icon: FaAddressCard, translationKey: "profileSettings" },
];

export default function AdminShell({ title, description, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/admin-login", { replace: true });
  };

  return (
    <DashboardShell
      backgroundClassName="bg-[radial-gradient(circle_at_top,_#d1fae5,_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-4 py-6 md:px-6"
      sidebarWidth="304px"
      sidebar={<AdminSidebar items={navItems} />}
      header={<AdminNavbar user={user} title={title} description={description} onLogout={handleLogout} />}
      contentClassName="dashboard-content"
    >
      {children}
    </DashboardShell>
  );
}
