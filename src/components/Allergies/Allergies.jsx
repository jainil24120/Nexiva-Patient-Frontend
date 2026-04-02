import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiInfo,
  FiX,
  FiRefreshCw
} from 'react-icons/fi';
import { getAllergies, addAllergy as apiAddAllergy, updateAllergy as apiUpdateAllergy, deleteAllergy as apiDeleteAllergy } from '../../api/api';
import './Allergies.css';

const Allergies = () => {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newAllergy, setNewAllergy] = useState({
    name: '',
    category: 'Food',
    severity: 'low',
    symptoms: '',
    notes: ''
  });

  const fetchAllergies = async () => {
    setLoading(true);
    try {
      const res = await getAllergies();
      const data = (res.data.data || []).map(a => ({
        id: a._id,
        name: a.name,
        category: a.category || 'Other',
        severity: a.severity || 'low',
        symptoms: a.symptoms || [],
        notes: a.notes || '',
        dateAdded: a.dateAdded ? new Date(a.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
      }));
      setAllergies(data);
    } catch (err) {
      console.error("Failed to fetch allergies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllergies(); }, []);

  const handleRefresh = () => { fetchAllergies(); };

  // Colors & icons
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#71717a';
    }
  };

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'high': return <FiAlertTriangle />;
      case 'medium': return <FiAlertCircle />;
      case 'low': return <FiInfo />;
      default: return null;
    }
  };

  const categoryColors = { 'Food': '#3b82f6', 'Environmental': '#22c55e', 'Medication': '#f59e0b', 'Other': '#71717a' };

  const handleSaveAllergy = async () => {
    if (!newAllergy.name.trim()) return;
    setSaving(true);

    const payload = {
      name: newAllergy.name,
      category: newAllergy.category,
      severity: newAllergy.severity,
      symptoms: typeof newAllergy.symptoms === 'string'
        ? newAllergy.symptoms.split(',').map(s => s.trim()).filter(Boolean)
        : newAllergy.symptoms,
      notes: newAllergy.notes,
    };

    try {
      if (editingId) {
        await apiUpdateAllergy(editingId, payload);
      } else {
        await apiAddAllergy(payload);
      }
      await fetchAllergies();
      setNewAllergy({ name: '', category: 'Food', severity: 'low', symptoms: '', notes: '' });
      setEditingId(null);
      setIsModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save allergy.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (allergy) => {
    setNewAllergy({
      name: allergy.name,
      category: allergy.category,
      severity: allergy.severity,
      symptoms: allergy.symptoms.join(', '),
      notes: allergy.notes
    });
    setEditingId(allergy.id);
    setIsModalOpen(true);
  };

  const handleDeleteAllergy = async (id) => {
    try {
      await apiDeleteAllergy(id);
      setAllergies(allergies.filter(a => a.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete allergy.");
    }
  };

  return (
    <motion.div className="allergies-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Allergies & Sensitivities</h1>
          <p className="page-subtitle">Manage your allergies and health sensitivities</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <button
            className={`refresh-btn ${loading ? 'loading' : ''}`}
            onClick={handleRefresh}
            disabled={loading}
          >
            <span className="refresh-icon"><FiRefreshCw /></span>
            <span>Refresh</span>
          </button>
          <button className="btn-primary" onClick={() => {
            setEditingId(null);
            setNewAllergy({ name: '', category: 'Food', severity: 'low', symptoms: '', notes: '' });
            setIsModalOpen(true);
          }}>
            <FiPlus /><span>Add Allergy</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="modern-loader"></div>
          <p className="loader-text">Loading your allergies...</p>
        </div>
      ) : allergies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <FiAlertCircle size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>No allergies recorded</p>
          <p style={{ fontSize: 13 }}>Add your allergies to keep your health records up to date.</p>
        </div>
      ) : (
        <div className="allergies-grid">
          {allergies.map(allergy => (
            <motion.div key={allergy.id} className="allergy-card" whileHover={{ scale: 1.02 }}>
              <div className="allergy-header">
                <div className="allergy-title-section">
                  <div className="severity-indicator" style={{ background: `${getSeverityColor(allergy.severity)}20`, color: getSeverityColor(allergy.severity) }}>
                    {getSeverityIcon(allergy.severity)}
                  </div>
                  <div>
                    <h3 className="allergy-name">{allergy.name}</h3>
                    <span className="allergy-category" style={{ color: categoryColors[allergy.category] }}>
                      {allergy.category}
                    </span>
                  </div>
                </div>
                <div className="allergy-actions">
                  <button className="icon-btn" onClick={() => handleEditClick(allergy)}><FiEdit2 /></button>
                  <button className="icon-btn delete" onClick={() => handleDeleteAllergy(allergy.id)}><FiTrash2 /></button>
                </div>
              </div>
              <div className="allergy-content">
                <div className="severity-badge" style={{ background: `${getSeverityColor(allergy.severity)}20`, color: getSeverityColor(allergy.severity) }}>
                  {allergy.severity} severity
                </div>
                <div className="symptoms-section">
                  <p className="section-label">Symptoms</p>
                  <div className="symptoms-list">{allergy.symptoms.map((s,i) => <span key={i} className="symptom-tag">{s}</span>)}</div>
                </div>
                <div className="notes-section">
                  <p className="section-label">Notes</p>
                  <p className="notes-text">{allergy.notes}</p>
                </div>
                <div className="allergy-footer">
                  <span className="date-added">Added: {allergy.dateAdded}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Allergy Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }}>
              <div className="modal-header">
                <h2>{editingId ? 'Edit Allergy' : 'Add New Allergy'}</h2>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                  setNewAllergy({ name: '', category: 'Food', severity: 'low', symptoms: '', notes: '' });
                }}><FiX /></button>
              </div>
              <div className="modal-body">
                <input type="text" placeholder="Allergy Name" value={newAllergy.name} onChange={e => setNewAllergy({...newAllergy, name: e.target.value})} />
                <select value={newAllergy.category} onChange={e => setNewAllergy({...newAllergy, category: e.target.value})}>
                  <option value="Food">Food</option>
                  <option value="Environmental">Environmental</option>
                  <option value="Medication">Medication</option>
                  <option value="Other">Other</option>
                </select>
                <select value={newAllergy.severity} onChange={e => setNewAllergy({...newAllergy, severity: e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input type="text" placeholder="Symptoms (comma separated)" value={newAllergy.symptoms} onChange={e => setNewAllergy({...newAllergy, symptoms: e.target.value})} />
                <textarea placeholder="Notes" value={newAllergy.notes} onChange={e => setNewAllergy({...newAllergy, notes: e.target.value})}></textarea>
              </div>
              <div className="modal-footer">
                <button className="btn-primary" onClick={handleSaveAllergy} disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Allergy'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Allergies;
