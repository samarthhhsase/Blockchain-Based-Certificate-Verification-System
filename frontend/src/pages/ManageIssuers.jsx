import { useEffect, useState } from "react";
import { scrollDashboardToSection } from "../components/layout/DashboardShell";
import AdminShell from "../components/admin/AdminShell";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { apiRequest } from "../utils/api";

const emptyForm = {
  issuer_name: "",
  email: "",
  password: "",
  institute_name: "",
  is_active: true,
};

export default function ManageIssuers() {
  const [issuers, setIssuers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedIssuer, setSelectedIssuer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadIssuers = async (query = search) => {
    setLoading(true);
    try {
      const response = await apiRequest("/admin/issuers", { params: query ? { search: query } : undefined });
      setIssuers(response.issuers || []);
    } catch (err) {
      setError(err.message || "Failed to load issuers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssuers("");
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = { ...form };
      if (editingId && !payload.password) delete payload.password;

      if (editingId) {
        await apiRequest(`/admin/issuers/${editingId}`, { method: "PUT", body: payload });
        setSuccess("Issuer updated successfully.");
      } else {
        await apiRequest("/admin/issuers", { method: "POST", body: payload });
        setSuccess("Issuer created successfully.");
      }

      resetForm();
      await loadIssuers();
    } catch (err) {
      setError(err.message || "Failed to save issuer");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (issuer) => {
    setEditingId(issuer.id);
    setForm({
      issuer_name: issuer.issuer_name,
      email: issuer.email,
      password: "",
      institute_name: issuer.institute_name || "",
      is_active: Boolean(issuer.is_active),
    });
    scrollDashboardToSection("issuer-form-section");
  };

  const handleDelete = async (issuer) => {
    if (!window.confirm(`Delete issuer "${issuer.issuer_name}"?`)) return;

    try {
      await apiRequest(`/admin/issuers/${issuer.id}`, { method: "DELETE" });
      setSuccess("Issuer deleted successfully.");
      if (selectedIssuer?.id === issuer.id) setSelectedIssuer(null);
      await loadIssuers();
    } catch (err) {
      setError(err.message || "Failed to delete issuer");
    }
  };

  const handleStatusToggle = async (issuer) => {
    try {
      await apiRequest(`/admin/issuers/${issuer.id}/status`, {
        method: "PATCH",
        body: { is_active: !issuer.is_active },
      });
      setSuccess(`Issuer ${issuer.is_active ? "deactivated" : "activated"} successfully.`);
      await loadIssuers();
      if (selectedIssuer?.id === issuer.id) {
        const details = await apiRequest(`/admin/issuers/${issuer.id}`);
        setSelectedIssuer(details.issuer);
      }
    } catch (err) {
      setError(err.message || "Failed to update issuer status");
    }
  };

  const handleView = async (issuerId) => {
    try {
      const response = await apiRequest(`/admin/issuers/${issuerId}`);
      setSelectedIssuer(response.issuer);
      scrollDashboardToSection("issuer-details-section");
    } catch (err) {
      setError(err.message || "Failed to fetch issuer details");
    }
  };

  return (
    <AdminShell title="Manage Issuers" description="Create issuer accounts, update login details, review certificate volume, and activate or deactivate access.">
      {error ? <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div> : null}

      <section className="dashboard-section-grid xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="rounded-[28px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-950">Issuer Directory</h2>
              <p className="mt-1 text-sm text-slate-600">Search by issuer name, email, username, or institute.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 md:w-72" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search issuers" />
              <Button onClick={() => loadIssuers(search)}>Search</Button>
            </div>
          </div>

          <div className="dashboard-table-wrap">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Issuer</th>
                  <th className="px-4 py-3">Login</th>
                  <th className="px-4 py-3">Institute</th>
                  <th className="px-4 py-3">Certificates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading issuers...</td></tr> : null}
                {!loading && issuers.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No issuers found.</td></tr> : null}
                {!loading ? issuers.map((issuer) => (
                  <tr key={issuer.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{issuer.issuer_name}</p>
                      <p className="text-xs text-slate-500">Created {new Date(issuer.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{issuer.email}</p>
                      <p className="text-xs text-slate-500">{issuer.username}</p>
                    </td>
                    <td className="px-4 py-4">{issuer.institute_name || "-"}</td>
                    <td className="px-4 py-4">{issuer.certificates_issued_count}</td>
                    <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${issuer.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{issuer.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="text-xs" onClick={() => handleView(issuer.id)}>View</Button>
                        <Button variant="secondary" className="text-xs" onClick={() => handleEdit(issuer)}>Edit</Button>
                        <Button variant="secondary" className="text-xs" onClick={() => handleStatusToggle(issuer)}>{issuer.is_active ? "Deactivate" : "Activate"}</Button>
                        <Button variant="danger" className="text-xs" onClick={() => handleDelete(issuer)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                )) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card id="issuer-form-section" data-dashboard-section className="rounded-[28px]">
            <h2 className="font-serif text-2xl font-bold text-slate-950">{editingId ? "Edit Issuer" : "Add Issuer"}</h2>
            <form className="mt-5 space-y-4 max-w-xl" onSubmit={handleSubmit}>
              <Input label="Issuer Name" value={form.issuer_name} onChange={(event) => setForm((prev) => ({ ...prev, issuer_name: event.target.value }))} required />
              <Input label="Email / Login" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required />
              <Input label={editingId ? "Password (leave blank to keep current)" : "Password"} type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required={!editingId} />
              <Input label="School / Institute" value={form.institute_name} onChange={(event) => setForm((prev) => ({ ...prev, institute_name: event.target.value }))} />
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} />Issuer active</label>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update Issuer" : "Create Issuer"}</Button>
                {editingId ? <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button> : null}
              </div>
            </form>
          </Card>

          <Card id="issuer-details-section" data-dashboard-section className="rounded-[28px]">
            <h2 className="font-serif text-2xl font-bold text-slate-950">Issuer Details</h2>
            {!selectedIssuer ? <p className="mt-4 text-sm text-slate-500">Select an issuer to inspect profile and recent certificates.</p> : (
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-lg font-semibold text-slate-900">{selectedIssuer.issuer_name}</p>
                  <p className="text-sm text-slate-600">{selectedIssuer.email}</p>
                  <p className="mt-2 text-sm text-slate-600">{selectedIssuer.institute_name || "Institute not set"}</p>
                  <p className="mt-2 text-xs text-slate-500">Certificates issued: {selectedIssuer.certificates_issued_count}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Recent certificates</p>
                  <div className="mt-3 space-y-3">
                    {(selectedIssuer.recentCertificates || []).length === 0 ? <p className="text-sm text-slate-500">No certificates issued yet.</p> : null}
                    {(selectedIssuer.recentCertificates || []).map((certificate) => (
                      <div key={certificate.id} className="rounded-2xl border border-slate-200 p-3">
                        <p className="font-medium text-slate-900">{certificate.certificate_no}</p>
                        <p className="text-sm text-slate-600">{certificate.student_name}</p>
                        <p className="text-xs text-slate-500">{certificate.course} • {certificate.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>
    </AdminShell>
  );
}
