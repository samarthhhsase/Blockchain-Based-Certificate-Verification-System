import { useEffect, useState } from "react";
import { scrollDashboardToSection } from "../components/layout/DashboardShell";
import AdminShell from "../components/admin/AdminShell";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { apiRequest } from "../utils/api";

export default function ManageCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCertificates = async (overrides = {}) => {
    setLoading(true);
    try {
      const params = {};
      const nextSearch = overrides.search ?? search;
      const nextStatus = overrides.status ?? status;
      if (nextSearch) params.search = nextSearch;
      if (nextStatus) params.status = nextStatus;
      const response = await apiRequest("/admin/certificates", { params });
      setCertificates(response.certificates || []);
    } catch (err) {
      setError(err.message || "Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates({ search: "", status: "" });
  }, []);

  const handleView = async (certificateId) => {
    try {
      const response = await apiRequest(`/admin/certificates/${certificateId}`);
      setSelectedCertificate(response.certificate);
      scrollDashboardToSection("certificate-details-section");
    } catch (err) {
      setError(err.message || "Failed to fetch certificate details");
    }
  };

  const handleRevoke = async (certificate) => {
    if (!window.confirm(`Revoke certificate "${certificate.certificate_no}"?`)) return;

    try {
      await apiRequest(`/admin/certificates/${certificate.id}/revoke`, { method: "PATCH" });
      setSuccess("Certificate revoked successfully.");
      await loadCertificates();
      if (selectedCertificate?.id === certificate.id) {
        await handleView(certificate.id);
      }
    } catch (err) {
      setError(err.message || "Failed to revoke certificate");
    }
  };

  return (
    <AdminShell title="Manage Certificates" description="Review every certificate across the platform, search by certificate, student, or issuer, and inspect detailed record metadata before revocation.">
      {error ? <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div> : null}

      <section className="dashboard-section-grid xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="rounded-[28px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-950">Certificate Registry</h2>
              <p className="mt-1 text-sm text-slate-600">Search by certificate ID, student name, or issuer name.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 sm:w-72" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search certificates" />
              <select className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All status</option>
                <option value="Valid">Valid</option>
                <option value="Revoked">Revoked</option>
                <option value="Expired">Expired</option>
              </select>
              <Button onClick={() => loadCertificates()}>Search</Button>
            </div>
          </div>

          <div className="dashboard-table-wrap dashboard-table-scroll">
            <table className="dashboard-table min-w-[840px]">
              <colgroup>
                <col className="w-[180px]" />
                <col className="w-[200px]" />
                <col className="w-[170px]" />
                <col className="w-[140px]" />
                <col className="w-[120px]" />
                <col className="w-[180px]" />
              </colgroup>
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="dashboard-table-head">Certificate</th>
                  <th className="dashboard-table-head">Student</th>
                  <th className="dashboard-table-head">Issuer</th>
                  <th className="dashboard-table-head">Issue Date</th>
                  <th className="dashboard-table-head">Status</th>
                  <th className="dashboard-table-head dashboard-sticky-action-head w-[200px] min-w-[200px] pr-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading certificates...</td></tr> : null}
                {!loading && certificates.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No certificates found.</td></tr> : null}
                {!loading ? certificates.map((certificate) => (
                  <tr key={certificate.id} className="dashboard-table-row border-t border-slate-200 align-top">
                    <td className="dashboard-table-cell">
                      <p className="font-semibold text-slate-900">{certificate.certificate_no}</p>
                      <p className="mt-1 text-xs text-slate-500">{certificate.certificate_type || certificate.course}</p>
                    </td>
                    <td className="dashboard-table-cell">
                      <p>{certificate.student_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{certificate.roll_number || "No roll number"}</p>
                    </td>
                    <td className="dashboard-table-cell">{certificate.issuer_name}</td>
                    <td className="dashboard-table-cell whitespace-nowrap">{certificate.issue_date ? new Date(certificate.issue_date).toLocaleDateString() : "-"}</td>
                    <td className="dashboard-table-cell"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${certificate.status === "Revoked" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{certificate.status}</span></td>
                    <td className="dashboard-table-cell dashboard-sticky-action-cell w-[200px] min-w-[200px] pr-5">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="text-xs px-3" onClick={() => handleView(certificate.id)}>View</Button>
                        <Button variant="danger" className="text-xs px-3" disabled={certificate.status === "Revoked"} onClick={() => handleRevoke(certificate)}>Revoke</Button>
                      </div>
                    </td>
                  </tr>
                )) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card id="certificate-details-section" data-dashboard-section className="rounded-[28px]">
          <h2 className="font-serif text-2xl font-bold text-slate-950">Certificate Details</h2>
          {!selectedCertificate ? <p className="mt-4 text-sm text-slate-500">Select a certificate to inspect issuer, student, subject marks, and hash details.</p> : (
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-lg font-semibold text-slate-900">{selectedCertificate.certificate_no}</p>
                <p className="text-sm text-slate-600">{selectedCertificate.student_name} • {selectedCertificate.issuer_name}</p>
                <p className="mt-2 text-sm text-slate-600">{selectedCertificate.course} • {selectedCertificate.certificate_type || "Certificate"}</p>
                <p className="mt-2 text-xs text-slate-500">Status: {selectedCertificate.status}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-900">Student Profile</p>
                  <p className="mt-2 text-slate-600">{selectedCertificate.student_email || "No email"}</p>
                  <p className="text-slate-600">Roll: {selectedCertificate.roll_number || selectedCertificate.roll_no || "-"}</p>
                  <p className="text-slate-600">Class: {selectedCertificate.class_name || selectedCertificate.class || "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-900">Issuer Profile</p>
                  <p className="mt-2 text-slate-600">{selectedCertificate.issuer_email || "No email"}</p>
                  <p className="text-slate-600">{selectedCertificate.institute_name || "Institute not set"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">Remarks</p>
                <p className="mt-2 whitespace-pre-wrap text-slate-600">{selectedCertificate.remarks || "-"}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">Hashes</p>
                <p className="mt-2 break-all text-slate-600">Certificate hash: {selectedCertificate.certificate_hash || "-"}</p>
                <p className="mt-2 break-all text-slate-600">Transaction hash: {selectedCertificate.blockchain_tx_hash || "-"}</p>
                <p className="mt-2 break-all text-slate-600">IPFS hash: {selectedCertificate.ipfs_hash || "-"}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">Subject-wise marks</p>
                <div className="mt-3 space-y-2">
                  {(selectedCertificate.subjects || []).length === 0 ? <p className="text-sm text-slate-500">No subject rows stored.</p> : null}
                  {(selectedCertificate.subjects || []).map((subject) => (
                    <div key={subject.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-slate-900">{subject.subject_name}</p>
                      <p className="text-slate-600">{subject.marks_scored}/{subject.out_of} • {Number(subject.subject_percentage).toFixed(2)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>
    </AdminShell>
  );
}
