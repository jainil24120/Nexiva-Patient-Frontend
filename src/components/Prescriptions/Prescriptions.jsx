import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiFileText, FiDownload, FiSearch } from "react-icons/fi";
import { getMyPrescriptions, getMyReports, downloadReport } from "../../api/api";
import "./Prescriptions.css";

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [presPage, setPresPage] = useState(1);
  const [repPage, setRepPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    Promise.all([
      getMyPrescriptions().catch(() => ({ data: { data: [] } })),
      getMyReports().catch(() => ({ data: { data: [] } })),
    ]).then(([presRes, repRes]) => {
      setPrescriptions(presRes.data.data || []);
      setReports(repRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleDownload = async (reportId, filename) => {
    try {
      const res = await downloadReport(reportId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "report";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert("Failed to download report."); }
  };

  // Reset page when search, tab, or rowsPerPage changes
  useEffect(() => { setPresPage(1); setRepPage(1); }, [searchQuery, rowsPerPage]);
  useEffect(() => { setPresPage(1); setRepPage(1); }, [activeTab]);

  const q = searchQuery.toLowerCase();
  const filteredPrescriptions = prescriptions.filter((p) => {
    if (!q) return true;
    const doctor = p.visit_id?.doctor_id;
    const hospital = p.visit_id?.file_id?.hospital_id;
    return (
      (p.diagnosis_summary || "").toLowerCase().includes(q) ||
      (p.doctor_notes || "").toLowerCase().includes(q) ||
      (doctor?.name || "").toLowerCase().includes(q) ||
      (hospital?.name || "").toLowerCase().includes(q)
    );
  });
  const filteredReports = reports.filter((r) => {
    if (!q) return true;
    return (
      (r.description || "").toLowerCase().includes(q) ||
      (r.title || "").toLowerCase().includes(q) ||
      (r.uploadedBy?.name || "").toLowerCase().includes(q)
    );
  });

  const presTotalPages = Math.max(1, Math.ceil(filteredPrescriptions.length / rowsPerPage));
  const repTotalPages = Math.max(1, Math.ceil(filteredReports.length / rowsPerPage));
  const pagedPrescriptions = filteredPrescriptions.slice((presPage - 1) * rowsPerPage, presPage * rowsPerPage);
  const pagedReports = filteredReports.slice((repPage - 1) * rowsPerPage, repPage * rowsPerPage);

  const paginationBar = (page, totalPages, setPage) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#94a3b8", fontSize: 13 }}>Rows per page:</span>
        <select
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value))}
          style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#94a3b8", fontSize: 13 }}
        >
          {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <span style={{ color: "#94a3b8", fontSize: 13 }}>Page {page} of {totalPages}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: page <= 1 ? "#475569" : "#94a3b8", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 13 }}
        >Prev</button>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: page >= totalPages ? "#475569" : "#94a3b8", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: 13 }}
        >Next</button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
        Loading prescriptions...
      </div>
    );
  }

  return (
    <motion.div className="prescriptions-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="pres-page-header">
        <FiFileText size={22} />
        <h1>Prescriptions & Reports</h1>
      </div>

      {/* Search */}
      <div className="pres-search-wrap">
        <FiSearch className="pres-search-icon" />
        <input
          type="text"
          className="pres-search-input"
          placeholder="Search by doctor, diagnosis, hospital, medicine..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="pres-search-clear" onClick={() => setSearchQuery("")}>&times;</button>
        )}
      </div>

      {/* Tabs */}
      <div className="pres-tabs">
        <button
          className={`pres-tab ${activeTab === "prescriptions" ? "active" : ""}`}
          onClick={() => setActiveTab("prescriptions")}
        >
          Prescriptions ({filteredPrescriptions.length})
        </button>
        <button
          className={`pres-tab ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          Reports ({filteredReports.length})
        </button>
      </div>

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="pres-list">
          {filteredReports.length === 0 ? (
            <div className="pres-empty"><p>No reports found.</p></div>
          ) : (
            <>
              {pagedReports.map((r) => (
                <div key={r._id} className="pres-card">
                  <div className="pres-card-header">
                    <div className="pres-card-left">
                      <div className="pres-card-icon"><FiFileText /></div>
                      <div>
                        <h3>{r.description || r.title || "Report"}</h3>
                        <p className="pres-sub">
                          Uploaded by {r.uploadedBy?.name || "Unknown"} &bull; {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}
                        </p>
                      </div>
                    </div>
                    <button
                      className="report-dl-btn"
                      onClick={() => handleDownload(r._id, r.description || "report")}
                    >
                      <FiDownload size={14} /> Download
                    </button>
                  </div>
                </div>
              ))}
              {paginationBar(repPage, repTotalPages, setRepPage)}
            </>
          )}
        </div>
      )}

      {/* Prescriptions Tab */}
      {activeTab === "prescriptions" && filteredPrescriptions.length === 0 && (
        <div className="pres-empty">
          <p>No prescriptions found.</p>
        </div>
      )}
      {activeTab === "prescriptions" && filteredPrescriptions.length > 0 && (
        <div className="pres-list">
          {pagedPrescriptions.map((p) => {
            const visit = p.visit_id;
            const doctor = visit?.doctor_id;
            const hospital = visit?.file_id?.hospital_id;
            const isOpen = expanded === p._id;

            return (
              <div key={p._id} className={`pres-card ${isOpen ? "open" : ""}`}>
                <div className="pres-card-header" onClick={() => setExpanded(isOpen ? null : p._id)}>
                  <div className="pres-card-left">
                    <div className="pres-card-icon">
                      <FiFileText />
                    </div>
                    <div>
                      <h3>{p.diagnosis_summary || "Prescription"}</h3>
                      <p className="pres-sub">
                        {doctor?.name || "Doctor"} &bull; {doctor?.specialization || ""}
                      </p>
                    </div>
                  </div>
                  <div className="pres-card-right">
                    <span className="pres-date">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
                    </span>
                    <span className="pres-hospital">{hospital?.name || ""}</span>
                  </div>
                  <span className="pres-chevron">{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && (
                  <div className="pres-card-body">
                    <div className="pres-detail-grid">
                      <div>
                        <label>Symptoms</label>
                        <p>{visit?.symptoms || "-"}</p>
                      </div>
                      <div>
                        <label>Diagnosis</label>
                        <p>{p.diagnosis_summary || "-"}</p>
                      </div>
                      <div>
                        <label>Visit Status</label>
                        <span className={`pres-status ${visit?.status === "completed" ? "completed" : "pending"}`}>
                          {visit?.status || "pending"}
                        </span>
                      </div>
                      <div>
                        <label>Date</label>
                        <p>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}</p>
                      </div>
                    </div>

                    {/* Medicines Table */}
                    {p.medicines?.length > 0 && (
                      <div className="pres-med-section">
                        <label>Medicines</label>
                        <table className="pres-med-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Medicine</th>
                              <th>Dosage</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                              <th>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.medicines.map((m, mi) => (
                              <tr key={mi}>
                                <td>{mi + 1}</td>
                                <td>{m.name}</td>
                                <td>{m.dosage || "-"}</td>
                                <td>{m.frequency || "-"}</td>
                                <td>{m.duration || "-"}</td>
                                <td>{m.quantity || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {p.doctor_notes && (
                      <div className="pres-notes-box">
                        <label>Doctor's Notes</label>
                        <p>{p.doctor_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {paginationBar(presPage, presTotalPages, setPresPage)}
        </div>
      )}
    </motion.div>
  );
}
