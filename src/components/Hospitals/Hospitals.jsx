import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiFileText, FiDownload, FiActivity, FiCalendar, FiUser, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { getMyHospitals, getMyVisits, getMyPrescriptions, getMyReports, downloadReport } from '../../api/api';
import './Hospitals.css';

const API_BASE = 'http://localhost:4000';

const Hospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [allVisits, setAllVisits] = useState([]);
  const [activeHospital, setActiveHospital] = useState(null);
  const [activeVisit, setActiveVisit] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [hospPage, setHospPage] = useState(1);
  const [visitPage, setVisitPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hospitalsRes, visitsRes, presRes, reportsRes] = await Promise.all([
        getMyHospitals().catch(() => ({ data: { data: [] } })),
        getMyVisits().catch(() => ({ data: { data: [] } })),
        getMyPrescriptions().catch(() => ({ data: { data: [] } })),
        getMyReports().catch(() => ({ data: { data: [] } })),
      ]);

      const hospitalsData = hospitalsRes.data.data || [];
      const visitsData = visitsRes.data.data || [];
      const presData = presRes.data.data || [];
      const reportsData = reportsRes.data.data || [];

      // Index prescriptions by visit_id
      const presMap = {};
      presData.forEach(p => {
        const vid = p.visit_id?._id || p.visit_id;
        if (vid) presMap[vid] = p;
      });

      // Group visits by hospital
      const hospitalMap = {};

      // Start with hospitals from the API
      hospitalsData.forEach(h => {
        hospitalMap[h.id] = {
          id: h.id,
          name: h.name || 'Unknown Hospital',
          location: h.location?.city || h.location?.state || h.location || '--',
          visits: [],
        };
      });

      // Add visits to their hospitals
      visitsData.forEach(v => {
        const hospitalId = v.file_id?.hospital_id?._id;
        const hospitalName = v.file_id?.hospital_id?.name || 'Unknown Hospital';

        if (!hospitalMap[hospitalId] && hospitalId) {
          hospitalMap[hospitalId] = {
            id: hospitalId,
            name: hospitalName,
            location: v.file_id?.hospital_id?.location?.city || '--',
            visits: [],
          };
        }

        if (hospitalId && hospitalMap[hospitalId]) {
          const pres = presMap[v._id];
          hospitalMap[hospitalId].visits.push({
            id: v._id,
            date: v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--',
            time: v.createdAt ? new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
            reason: v.symptoms || v.diagnosis || v.visit_type || 'Consultation',
            doctor: v.doctor_id?.name || 'Doctor',
            specialty: v.doctor_id?.specialization || 'General',
            notes: v.notes || '',
            status: v.status || 'completed',
            prescriptions: pres ? [{
              _id: pres._id,
              diagnosis: pres.diagnosis_summary || '',
              doctorNotes: pres.doctor_notes || '',
              medicines: pres.medicines || [],
              pharmacy: pres.pharmacy || {},
              date: pres.createdAt,
            }] : [],
            reports: reportsData.map(r => ({
              _id: r._id,
              description: r.description || 'Report',
              fileUrl: r.fileUrl,
              createdAt: r.createdAt,
              uploadedBy: r.uploadedBy?.name || 'Unknown',
            })),
          });
        }
      });

      setHospitals(Object.values(hospitalMap));
      setAllVisits(visitsData);
    } catch (err) {
      console.error("Failed to fetch hospital data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setHospPage(1); }, [searchQuery]);
  useEffect(() => { setVisitPage(1); }, [activeHospital]);

  const handleRefresh = () => { fetchData(); };

  const PaginationBar = ({ page, setPage, totalItems }) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', gap: 12, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
          Rows per page:
          <select
            value={rowsPerPage}
            onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 13 }}
          >
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
          Page {page} of {totalPages}
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', fontSize: 13, opacity: page <= 1 ? 0.4 : 1 }}
          >Prev</button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', fontSize: 13, opacity: page >= totalPages ? 0.4 : 1 }}
          >Next</button>
        </div>
      </div>
    );
  };

  return (
    <div className="hospitals-wrapper">
      <header className="page-header">
        <div className="header-content">
          {activeHospital && (
            <button className="icon-back-btn" onClick={() => activeVisit ? setActiveVisit(null) : setActiveHospital(null)}>
              <FiArrowLeft />
            </button>
          )}
          <h1 className="page-title">
            {!activeHospital ? "Medical Network" : !activeVisit ? activeHospital.name : "Consultation Details"}
          </h1>
          <button
            className={`refresh-btn ${loading ? 'loading' : ''}`}
            onClick={handleRefresh}
            disabled={loading}
            style={{ marginLeft: 'auto' }}
          >
            <span className="refresh-icon"><FiRefreshCw /></span>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <main className="content-area">
        {loading ? (
          <div className="loader-container" style={{ minHeight: '400px' }}>
            <div className="modern-loader"></div>
            <p className="loader-text">Synchronizing medical network...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* VIEW 1: HOSPITAL LIST */}
            {!activeHospital && (
              <motion.div key="hospitals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="search-bar-container">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    className="hospital-search-input"
                    placeholder="Search hospitals by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {hospitals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <FiActivity size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 16, fontWeight: 600 }}>No hospitals found</p>
                    <p style={{ fontSize: 13 }}>Hospitals will appear here once you have medical records.</p>
                  </div>
                ) : (
                  <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Hospital Name</th>
                        <th>Location</th>
                        <th>Records</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = hospitals.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));
                        const paginated = filtered.slice((hospPage - 1) * rowsPerPage, hospPage * rowsPerPage);
                        return paginated.length > 0 ? paginated.map(h => (
                          <tr key={h.id}>
                            <td className="font-bold">{h.name}</td>
                            <td>{h.location}</td>
                            <td><span className="badge">{h.visits.length} Visits</span></td>
                            <td>
                              <div className="action-buttons-row">
                                <button className="btn-small outline" onClick={() => setActiveHospital(h)}>View History</button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="4" className="empty-state text-center" style={{ padding: '2rem' }}>No hospitals match your search.</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                  <PaginationBar page={hospPage} setPage={setHospPage} totalItems={hospitals.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase())).length} />
                  </>
                )}
              </motion.div>
            )}

            {/* VIEW 2: VISITS LIST */}
            {activeHospital && !activeVisit && (
              <motion.div key="visits" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                {activeHospital.visits.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <p style={{ fontSize: 15 }}>No visits recorded at this hospital.</p>
                  </div>
                ) : (
                  <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th><FiCalendar /> Date</th>
                        <th>Doctor</th>
                        <th>Reason</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeHospital.visits.slice((visitPage - 1) * rowsPerPage, visitPage * rowsPerPage).map(v => (
                        <tr key={v.id} onClick={() => setActiveVisit(v)}>
                          <td><div className="date-cell"><strong>{v.date}</strong><small>{v.time}</small></div></td>
                          <td>{v.doctor}</td>
                          <td>{v.reason}</td>
                          <td><button className="btn-small">View Full Record</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationBar page={visitPage} setPage={setVisitPage} totalItems={activeHospital.visits.length} />
                  </>
                )}
              </motion.div>
            )}

            {/* VIEW 3: VISIT DETAILS */}
            {activeVisit && (
              <motion.div key="details" className="details-grid" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                <section className="detail-card full-width">
                  <div className="card-header-flex">
                    <h3><FiActivity /> Visit Information</h3>
                  </div>
                  <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div><strong style={{ color: '#64748b', fontSize: 12 }}>Date</strong><p style={{ color: '#e2e8f0', margin: '4px 0' }}>{activeVisit.date} at {activeVisit.time}</p></div>
                    <div><strong style={{ color: '#64748b', fontSize: 12 }}>Doctor</strong><p style={{ color: '#e2e8f0', margin: '4px 0' }}>{activeVisit.doctor}</p></div>
                    <div><strong style={{ color: '#64748b', fontSize: 12 }}>Specialty</strong><p style={{ color: '#e2e8f0', margin: '4px 0' }}>{activeVisit.specialty}</p></div>
                    <div><strong style={{ color: '#64748b', fontSize: 12 }}>Reason</strong><p style={{ color: '#e2e8f0', margin: '4px 0' }}>{activeVisit.reason}</p></div>
                    <div><strong style={{ color: '#64748b', fontSize: 12 }}>Status</strong><p style={{ color: '#22c55e', margin: '4px 0', textTransform: 'capitalize' }}>{activeVisit.status}</p></div>
                    {activeVisit.notes && (
                      <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#64748b', fontSize: 12 }}>Notes</strong><p style={{ color: '#94a3b8', margin: '4px 0' }}>{activeVisit.notes}</p></div>
                    )}
                  </div>
                </section>

                <section className="detail-card full-width">
                  <div className="card-header-flex">
                    <h3><FiFileText /> Prescription</h3>
                  </div>
                  <div style={{ padding: '0 20px 20px' }}>
                    {activeVisit.prescriptions?.length > 0 ? activeVisit.prescriptions.map((p) => (
                      <div key={p._id}>
                        {p.diagnosis && (
                          <div style={{ marginBottom: 12 }}>
                            <strong style={{ color: '#64748b', fontSize: 12 }}>Diagnosis</strong>
                            <p style={{ color: '#e2e8f0', margin: '4px 0' }}>{p.diagnosis}</p>
                          </div>
                        )}

                        {p.medicines?.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <strong style={{ color: '#64748b', fontSize: 12 }}>Medicines</strong>
                            <table className="data-table" style={{ marginTop: 8 }}>
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
                                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                                    <td>{m.dosage || '-'}</td>
                                    <td>{m.frequency || '-'}</td>
                                    <td>{m.duration || '-'}</td>
                                    <td>{m.quantity || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {p.doctorNotes && (
                          <div style={{ marginBottom: 12 }}>
                            <strong style={{ color: '#64748b', fontSize: 12 }}>Doctor's Notes</strong>
                            <p style={{ color: '#94a3b8', margin: '4px 0', fontStyle: 'italic' }}>{p.doctorNotes}</p>
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="empty-state text-center" style={{ padding: '2rem' }}>
                        <p>No prescription available for this visit.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="detail-card full-width">
                  <div className="card-header-flex">
                    <h3><FiFileText /> Lab Reports</h3>
                  </div>
                  <div className="file-list">
                    {activeVisit.reports?.length > 0 ? activeVisit.reports.map((r) => (
                      <div key={r._id} className="file-item">
                        <div className="file-info">
                          <FiFileText className="file-icon" />
                          <div>
                            <p className="file-name">{r.description}</p>
                            <span className="file-size">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '--'} &bull; by {r.uploadedBy}
                            </span>
                          </div>
                        </div>
                        <div className="file-actions">
                          <button
                            className="action-icon view"
                            title="Download"
                            onClick={async () => {
                              try {
                                const res = await downloadReport(r._id);
                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = r.description || 'report';
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                              } catch { alert('Failed to download report.'); }
                            }}
                          >
                            <FiDownload />
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="empty-state text-center" style={{ padding: '2rem' }}>
                        <p>No lab reports available.</p>
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};

export default Hospitals;
