import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiDownload, FiCalendar, FiUser, FiMapPin,
  FiChevronDown, FiActivity, FiFileText, FiCheckCircle, FiClock
} from 'react-icons/fi';

const SPECIALTY_COLORS = {
  Cardiologist:      { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   dot: '#ef4444',  label: '#f87171' },
  'General Physician':{ bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  dot: '#3b82f6',  label: '#60a5fa' },
  Dermatologist:     { bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.35)',  dot: '#a855f7',  label: '#c084fc' },
  Orthopedic:        { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  dot: '#f59e0b',  label: '#fbbf24' },
  Neurologist:       { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.35)',  dot: '#14b8a6',  label: '#2dd4bf' },
  default:           { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   dot: '#22c55e',  label: '#4ade80' },
};

const getColor = (specialty) => SPECIALTY_COLORS[specialty] || SPECIALTY_COLORS.default;

export default function VisitTimeline({ visits = [] }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  const specialties = ['all', ...new Set(visits.map(v => v.specialty).filter(Boolean))];

  const filtered = filter === 'all' ? visits : visits.filter(v => v.specialty === filter);

  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  if (visits.length === 0) {
    return (
      <div style={s.empty}>
        <FiActivity size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
        <p style={s.emptyTitle}>No visits recorded yet</p>
        <p style={s.emptySub}>Your hospital visits will appear here</p>
      </div>
    );
  }

  return (
    <div style={s.root}>
      {/* Filter chips */}
      {specialties.length > 2 && (
        <div style={s.filterRow}>
          {specialties.map(sp => (
            <motion.button
              key={sp}
              style={{ ...s.chip, ...(filter === sp ? s.chipActive : {}) }}
              onClick={() => setFilter(sp)}
              whileTap={{ scale: 0.95 }}
            >
              {sp === 'all' ? 'All visits' : sp}
            </motion.button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div style={s.timeline}>
        {/* Vertical line */}
        <div style={s.line} />

        <AnimatePresence>
          {filtered.map((visit, i) => {
            const color = getColor(visit.specialty);
            const isOpen = expandedId === visit.id;

            return (
              <motion.div
                key={visit.id}
                style={s.entryWrap}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 100 }}
              >
                {/* Dot on line */}
                <div style={s.dotWrap}>
                  <motion.div
                    style={{ ...s.dot, background: color.dot, boxShadow: `0 0 0 4px ${color.bg}` }}
                    animate={isOpen ? { scale: 1.3 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  />
                </div>

                {/* Card */}
                <motion.div
                  style={{ ...s.card, border: `1px solid ${isOpen ? color.border : 'rgba(255,255,255,0.07)'}`, }}
                  animate={{ borderColor: isOpen ? color.border : 'rgba(255,255,255,0.07)' }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Card Header — always visible */}
                  <div style={s.cardHeader} onClick={() => toggle(visit.id)}>
                    <div style={s.cardLeft}>
                      {/* Specialty badge */}
                      <span style={{ ...s.badge, background: color.bg, color: color.label, border: `1px solid ${color.border}` }}>
                        {visit.specialty || 'General'}
                      </span>
                      <h3 style={s.hospitalName}>{visit.hospital}</h3>
                      <p style={s.visitReason}>{visit.reason}</p>
                    </div>

                    <div style={s.cardRight}>
                      <div style={s.dateChip}>
                        <FiCalendar size={11} />
                        <span>{visit.date}</span>
                      </div>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        style={s.chevron}
                      >
                        <FiChevronDown size={16} color="#64748b" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Expandable details */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={s.details}>
                          <div style={s.divider} />

                          {/* Info grid */}
                          <div style={s.infoGrid}>
                            <InfoItem icon={<FiUser size={14} />} label="Doctor" value={visit.doctor} />
                            <InfoItem icon={<FiMapPin size={14} />} label="Hospital" value={visit.hospital} />
                            <InfoItem icon={<FiClock size={14} />} label="Time" value={visit.time || '—'} />
                            <InfoItem icon={<FiCheckCircle size={14} />} label="Status" value={visit.status || 'Completed'} valueColor="#22c55e" />
                          </div>

                          {/* Prescription medicines */}
                          {visit.medicines?.length > 0 && (
                            <div style={s.presSection}>
                              <p style={s.presSectionTitle}>Prescription</p>
                              <div style={s.medTable}>
                                <div style={s.medHeader}>
                                  <span style={{ flex: 2 }}>Medicine</span>
                                  <span style={{ flex: 1 }}>Dosage</span>
                                  <span style={{ flex: 1 }}>Frequency</span>
                                  <span style={{ flex: 1 }}>Duration</span>
                                  <span style={{ flex: 0.5 }}>Qty</span>
                                </div>
                                {visit.medicines.map((m, mi) => (
                                  <div key={mi} style={s.medRow}>
                                    <span style={{ flex: 2, fontWeight: 600, color: '#e2e8f0' }}>{m.name}</span>
                                    <span style={{ flex: 1 }}>{m.dosage || '-'}</span>
                                    <span style={{ flex: 1 }}>{m.frequency || '-'}</span>
                                    <span style={{ flex: 1 }}>{m.duration || '-'}</span>
                                    <span style={{ flex: 0.5 }}>{m.quantity || '-'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Doctor notes */}
                          {(visit.doctorNotes || visit.notes) && (
                            <div style={s.notesBox}>
                              <p style={s.notesLabel}>Doctor's Notes</p>
                              <p style={s.notesText}>{visit.doctorNotes || visit.notes}</p>
                            </div>
                          )}

                          {!visit.hasPrescription && (
                            <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', marginBottom: 14 }}>
                              No prescription added yet for this visit.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value, valueColor }) {
  return (
    <div style={s.infoItem}>
      <div style={s.infoIcon}>{icon}</div>
      <div>
        <p style={s.infoLabel}>{label}</p>
        <p style={{ ...s.infoValue, ...(valueColor ? { color: valueColor } : {}) }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = {
  root: { width: '100%' },

  filterRow: {
    display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24,
  },
  chip: {
    padding: '5px 14px', borderRadius: 20,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#64748b', fontSize: 12, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  chipActive: {
    background: 'rgba(59,130,246,0.15)',
    border: '1px solid rgba(59,130,246,0.4)',
    color: '#60a5fa',
  },

  timeline: { position: 'relative', paddingLeft: 32 },

  line: {
    position: 'absolute', left: 7, top: 8, bottom: 8,
    width: 2,
    background: 'linear-gradient(to bottom, rgba(59,130,246,0.5), rgba(59,130,246,0.05))',
    borderRadius: 2,
  },

  entryWrap: {
    position: 'relative', marginBottom: 16,
  },

  dotWrap: {
    position: 'absolute', left: -32, top: 18,
    width: 16, display: 'flex', justifyContent: 'center',
  },
  dot: {
    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
  },

  card: {
    background: 'rgba(15,20,35,0.8)',
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
  },

  cardHeader: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12,
    padding: '16px 18px',
  },
  cardLeft: { flex: 1, minWidth: 0 },
  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 },

  badge: {
    display: 'inline-block', padding: '3px 10px',
    borderRadius: 20, fontSize: 11, fontWeight: 600,
    marginBottom: 7,
  },
  hospitalName: {
    fontSize: 14, fontWeight: 700, color: '#e2e8f0',
    margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  visitReason: { fontSize: 12, color: '#64748b', margin: 0 },

  dateChip: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 11, color: '#475569',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8, padding: '4px 10px',
  },
  chevron: { display: 'flex', alignItems: 'center', marginTop: 2 },

  details: { padding: '0 18px 18px' },
  divider: { height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 },

  infoGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 12, marginBottom: 14,
  },
  infoItem: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  infoIcon: {
    width: 28, height: 28, borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#475569', flexShrink: 0,
  },
  infoLabel: { fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px' },
  infoValue: { fontSize: 13, fontWeight: 600, color: '#cbd5e1', margin: 0 },

  notesBox: {
    background: 'rgba(59,130,246,0.06)',
    border: '1px solid rgba(59,130,246,0.15)',
    borderLeft: '3px solid #3b82f6',
    borderRadius: '0 8px 8px 0',
    padding: '10px 14px', marginBottom: 14,
  },
  notesLabel: { fontSize: 10, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px', fontWeight: 600 },
  notesText: { fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 },

  actions: { display: 'flex', gap: 10 },
  downloadBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 16px',
    background: 'rgba(59,130,246,0.12)',
    border: '1px solid rgba(59,130,246,0.3)',
    color: '#60a5fa', borderRadius: 9,
    fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s',
  },
  viewBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#64748b', borderRadius: 9,
    fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  // Prescription styles
  presSection: {
    marginBottom: 14,
  },
  presSectionTitle: {
    fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px',
    fontWeight: 700, margin: '0 0 8px',
  },
  medTable: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  medHeader: {
    display: 'flex', gap: 8, padding: '8px 14px',
    background: 'rgba(255,255,255,0.04)',
    fontSize: 10, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.3px',
  },
  medRow: {
    display: 'flex', gap: 8, padding: '8px 14px',
    fontSize: 13, color: '#94a3b8',
    borderTop: '1px solid rgba(255,255,255,0.04)',
  },

  empty: { textAlign: 'center', padding: '40px 20px', color: '#475569' },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: '#64748b', margin: '0 0 5px' },
  emptySub: { fontSize: 13, margin: 0 },
};