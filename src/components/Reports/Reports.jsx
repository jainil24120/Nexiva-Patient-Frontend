import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiDownload,
  FiEye,
  FiUpload,
  FiSearch,
  FiX,
  FiTrash2,
  FiRefreshCw
} from 'react-icons/fi';
import { getMyReports, uploadReport, downloadReport, getPatientProfile } from '../../api/api';
import './Reports.css';

const API_BASE = 'http://localhost:4000';

const MedicalReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const fileInputRef = useRef(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch patient profile _id for uploads
      if (!patientId) {
        try {
          const profileRes = await getPatientProfile();
          if (profileRes.data?.data?._id) setPatientId(profileRes.data.data._id);
        } catch {}
      }
      const res = await getMyReports();
      const data = (res.data.data || []).map(r => ({
        id: r._id,
        name: r.description || r.fileUrl?.split('/').pop() || 'Report',
        date: r.createdAt ? new Date(r.createdAt).toLocaleString() : '--',
        size: '--',
        fileUrl: r.fileUrl,
      }));
      setReports(data);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleRefresh = () => { fetchReports(); };

  const handleView = async (report) => {
    if (!report.fileUrl) {
      alert("No file attached to this report.");
      return;
    }
    try {
      const res = await downloadReport(report.id);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke after a delay so the new tab has time to load
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Failed to view report:", err);
      alert("Failed to open report.");
    }
  };

  const handleDownload = async (report) => {
    try {
      const res = await downloadReport(report.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = report.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback: open file URL directly
      if (report.fileUrl) {
        const url = report.fileUrl.startsWith('http') ? report.fileUrl : `${API_BASE}/${report.fileUrl}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = report.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Failed to download report.");
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File must be less than 5MB.");
      event.target.value = null;
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', file.name);
      if (patientId) formData.append('patientId', patientId);
      await uploadReport(formData);
      await fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload report.");
    } finally {
      setUploading(false);
      if (event.target) event.target.value = null;
    }
  };

  const filteredReports = reports.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.includes(searchQuery)
  );

  // Reset to page 1 when search or rowsPerPage changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / rowsPerPage));
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <motion.div className="reports-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <div className="reports-header">
        <h1>Medical Reports</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className={`refresh-btn ${loading ? 'loading' : ''}`}
            onClick={handleRefresh}
            disabled={loading}
          >
            <span className="refresh-icon"><FiRefreshCw /></span>
            <span>Refresh</span>
          </button>
          <button className="btn-primary" onClick={() => fileInputRef.current.click()} disabled={uploading}>
            <FiUpload /> {uploading ? 'Uploading...' : 'Upload Report'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loader-container" style={{ minHeight: '300px' }}>
          <div className="modern-loader"></div>
          <p className="loader-text">Loading medical reports...</p>
        </div>
      ) : (
        <>
          <div className="reports-controls">
            <div className="search-box">
              <FiSearch />
              <input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <FiUpload size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 16, fontWeight: 600 }}>No reports found</p>
              <p style={{ fontSize: 13 }}>Upload your medical reports or they will appear here once uploaded by your doctor.</p>
            </div>
          ) : (
            <>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={(e) => setSelectedIds(e.target.checked ? filteredReports.map(r => r.id) : [])}
                      checked={selectedIds.length === filteredReports.length && filteredReports.length > 0}
                    />
                  </th>
                  <th>ID</th>
                  <th>Report Name</th>
                  <th>Date & Time</th>
                  <th>File Size</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {paginatedReports.map((r) => (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={selectedIds.includes(r.id) ? 'selected-row' : ''}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => setSelectedIds(prev => prev.includes(r.id) ? prev.filter(i => i !== r.id) : [...prev, r.id])}
                        />
                      </td>
                      <td className="id-cell">{r.id.slice(-8).toUpperCase()}</td>
                      <td className="report-name">{r.name}</td>
                      <td>{r.date}</td>
                      <td>{r.size}</td>
                      <td>
                        <div className="action-cell">
                          <button className="action-btn view" onClick={() => handleView(r)} title="View"><FiEye /></button>
                          <button className="action-btn download" onClick={() => handleDownload(r)} title="Download"><FiDownload /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Pagination Bar */}
            {filteredReports.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                padding: '10px 18px',
                marginTop: '12px',
                color: '#94a3b8',
                fontSize: '13px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <span>Page {currentPage} of {totalPages}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: currentPage === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                      color: currentPage === 1 ? '#475569' : '#e2e8f0',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      padding: '5px 14px',
                      fontSize: '13px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      background: currentPage === totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                      color: currentPage === totalPages ? '#475569' : '#e2e8f0',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      padding: '5px 14px',
                      fontSize: '13px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}

          {/* Bulk Action Bar */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div className="bulk-bar" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}>
                <div className="bulk-content">
                  <FiX className="close-icon" onClick={() => setSelectedIds([])} />
                  <span className="count-info">{selectedIds.length} selected</span>
                  <div className="divider" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};

export default MedicalReports;
