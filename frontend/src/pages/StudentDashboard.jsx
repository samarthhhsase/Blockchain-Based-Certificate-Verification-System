import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBook, FaClipboardList, FaDownload, FaHome, FaSignOutAlt } from "react-icons/fa";
import Layout from "../components/layout/Layout";
import { scrollDashboardToSection } from "../components/layout/DashboardShell";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../utils/api";

function statusBadge(status) {
  if (status === "Revoked") return "bg-red-100 text-red-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const [stats, setStats] = useState({ totalCertificates: 0, totalRevoked: 0, totalComplaints: 0 });
  const [certificates, setCertificates] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [certificateId, setCertificateId] = useState("");
  const [expandedCertificateNo, setExpandedCertificateNo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const certificateOptions = useMemo(
    () => certificates.map((certificate) => ({ value: certificate.id, label: `${certificate.certificate_no} | ${certificate.course}` })),
    [certificates]
  );

  const fetchAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [statsRes, certificatesRes, complaintsRes] = await Promise.all([
        apiRequest("/student/dashboard/stats"),
        apiRequest("/student/certificates"),
        apiRequest("/student/complaints"),
      ]);

      setStats(statsRes.stats || { totalCertificates: 0, totalRevoked: 0, totalComplaints: 0 });
      setCertificates(certificatesRes.certificates || []);
      setComplaints(complaintsRes.complaints || []);
    } catch (err) {
      setError(err.message || t("loadFailedDashboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const submitComplaint = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await apiRequest("/student/complaints", {
        method: "POST",
        body: {
          certificateId,
          message,
        },
      });
      setSuccess(t("complaintSubmittedSuccessfully"));
      setCertificateId("");
      setMessage("");
      await fetchAll();
    } catch (err) {
      setError(err.message || t("failedToSubmitComplaint"));
    }
  };

  const downloadPdf = async (certNo) => {
    try {
      const blob = await apiRequest(`/student/certificates/${encodeURIComponent(certNo)}/pdf`, { isBlob: true });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${certNo}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || t("failedToDownloadCertificatePdf"));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const sidebarItems = [
    { label: "Dashboard", icon: FaHome, onClick: () => scrollDashboardToSection("top"), translationKey: "dashboard" },
    { label: "My Certificates", icon: FaBook, onClick: () => scrollDashboardToSection("certificates-section"), translationKey: "myCertificates" },
    { label: "Submit Complaint", icon: FaClipboardList, onClick: () => scrollDashboardToSection("complaints-section"), translationKey: "submitComplaint" },
    { label: "Logout", icon: FaSignOutAlt, onClick: handleLogout, translationKey: "logout" },
  ];

  return (
    <Layout role={user?.role} userName={user?.username} sidebarItems={sidebarItems}>
      <div id="top" data-dashboard-section className="h-px" />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <section className="dashboard-section-grid lg:grid-cols-3">
        <Card className="dashboard-stat-card"><p className="text-sm text-slate-500">{t("myCertificates")}</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{stats.totalCertificates}</p></Card>
        <Card className="dashboard-stat-card"><p className="text-sm text-slate-500">{t("revokedCertificates")}</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{stats.totalRevoked}</p></Card>
        <Card className="dashboard-stat-card"><p className="text-sm text-slate-500">{t("complaints")}</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{stats.totalComplaints}</p></Card>
      </section>

      {loading ? (
        <Card>
          <div className="flex items-center gap-3 text-slate-600">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            {t("loadingStudentData")}
          </div>
        </Card>
      ) : (
        <>
          <Card id="certificates-section" data-dashboard-section>
            <h2 className="mb-4 text-lg font-bold text-slate-900">{t("myCertificates")}</h2>
            <div className="dashboard-table-wrap dashboard-table-scroll rounded-[20px]">
              <table className="dashboard-table min-w-[980px]">
                <colgroup>
                  <col className="w-[150px]" />
                  <col className="w-[220px]" />
                  <col className="w-[130px]" />
                  <col className="w-[220px]" />
                  <col className="w-[130px]" />
                  <col className="w-[120px]" />
                  <col className="w-[210px]" />
                </colgroup>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="dashboard-table-head">{t("certificateId")}</th>
                    <th className="dashboard-table-head">{t("course")}</th>
                    <th className="dashboard-table-head">{t("overallPercentage")}</th>
                    <th className="dashboard-table-head">{t("issuerDetails")}</th>
                    <th className="dashboard-table-head">{t("issueDate")}</th>
                    <th className="dashboard-table-head">{t("status")}</th>
                    <th className="dashboard-table-head dashboard-sticky-action-head w-[220px] min-w-[220px] pr-5">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((certificate) => (
                    <Fragment key={certificate.id}>
                      <tr className="dashboard-table-row border-t border-slate-200">
                        <td className="dashboard-table-cell font-medium text-slate-800">{certificate.certificate_no}</td>
                        <td className="dashboard-table-cell">
                          <p>{certificate.course}</p>
                          <p className="mt-1 text-xs text-slate-500">Grade: {certificate.grade}</p>
                        </td>
                        <td className="dashboard-table-cell font-semibold text-cyan-700">
                          {certificate.overall_percentage !== null ? `${Number(certificate.overall_percentage).toFixed(2)}%` : "-"}
                        </td>
                        <td className="dashboard-table-cell">
                          <p>{certificate.issuer_name}</p>
                          <p className="mt-1 break-words text-xs text-slate-500">{certificate.issuer_email}</p>
                        </td>
                        <td className="dashboard-table-cell whitespace-nowrap">{certificate.issue_date ? new Date(certificate.issue_date).toLocaleDateString() : "-"}</td>
                        <td className="dashboard-table-cell">
                          <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusBadge(certificate.status)}`}>{certificate.status}</span>
                        </td>
                        <td className="dashboard-table-cell dashboard-sticky-action-cell w-[220px] min-w-[220px] pr-5">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              className="text-xs px-3"
                              onClick={() => setExpandedCertificateNo((prev) => prev === certificate.certificate_no ? "" : certificate.certificate_no)}
                            >
                              {expandedCertificateNo === certificate.certificate_no ? t("hideMarks") : t("viewMarks")}
                            </Button>
                            <Button variant="secondary" className="text-xs px-3" onClick={() => downloadPdf(certificate.certificate_no)}>
                              <FaDownload /> PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedCertificateNo === certificate.certificate_no ? (
                        <tr className="border-t border-slate-100 bg-slate-50/80">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr,1.3fr]">
                              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">{t("overallPercentage")}</p>
                                <p className="mt-2 text-3xl font-extrabold text-cyan-900">
                                  {certificate.overall_percentage !== null ? `${Number(certificate.overall_percentage).toFixed(2)}%` : "-"}
                                </p>
                                <div className="mt-3 space-y-1 text-sm text-cyan-900">
                                  <p><span className="font-semibold">{t("rollNo")}:</span> {certificate.roll_no || "-"}</p>
                                  <p><span className="font-semibold">{t("year")}:</span> {certificate.year || "-"}</p>
                                  <p><span className="font-semibold">{t("certificateType")}:</span> {certificate.certificate_type || "-"}</p>
                                  <p><span className="font-semibold">{t("semester")}:</span> {certificate.semester}</p>
                                </div>
                                <div className="mt-4 rounded-xl border border-cyan-200 bg-white/70 p-3 text-sm text-slate-700">
                                  <p className="font-semibold text-slate-900">{t("remarks")}</p>
                                  <p className="mt-1 whitespace-pre-wrap">{certificate.remarks || "-"}</p>
                                </div>
                              </div>

                              <div className="overflow-x-auto rounded-[20px] border border-slate-200 bg-white">
                                <table className="min-w-full text-left text-sm">
                                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                      <th className="px-4 py-3">{t("subject")}</th>
                                      <th className="px-4 py-3">{t("marksObtained")}</th>
                                      <th className="px-4 py-3">{t("outOf")}</th>
                                      <th className="px-4 py-3">{t("percentage")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(certificate.subjects || []).map((subject) => (
                                      <tr key={subject.id} className="border-t border-slate-200">
                                        <td className="px-4 py-3 font-medium text-slate-800">{subject.subject_name}</td>
                                        <td className="px-4 py-3">{subject.marks_scored}</td>
                                        <td className="px-4 py-3">{subject.out_of}</td>
                                        <td className="px-4 py-3 text-cyan-700">{Number(subject.subject_percentage).toFixed(2)}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <section id="complaints-section" data-dashboard-section className="dashboard-section-grid xl:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-900">{t("submitComplaint")}</h2>
              <form onSubmit={submitComplaint} className="space-y-4">
                <Input label={t("certificate")} as="select" value={certificateId} onChange={(event) => setCertificateId(event.target.value)} required>
                  <option value="">{t("verifyCertificate")}</option>
                  {certificateOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Input>

                <Input
                  label={t("message")}
                  as="textarea"
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t("describeIssue")}
                  required
                />

                <Button type="submit" className="w-full">{t("submitComplaint")}</Button>
              </form>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-900">{t("complaintStatus")}</h2>
              <div className="space-y-3">
                {complaints.map((complaint) => (
                  <div key={complaint.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{complaint.certificate_no}</p>
                    <p className="text-slate-700">{complaint.message}</p>
                    <p className="text-xs text-slate-500">{new Date(complaint.created_at).toLocaleString()}</p>
                    <p className={`mt-1 inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${complaint.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {complaint.status}
                    </p>
                    {complaint.response ? <p className="mt-2 text-xs text-emerald-700">{t("response")}: {complaint.response}</p> : null}
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </Layout>
  );
}
