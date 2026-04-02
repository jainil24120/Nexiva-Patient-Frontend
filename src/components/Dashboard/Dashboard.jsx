import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiUser, FiDroplet, FiActivity } from "react-icons/fi";
import { getMyVisits, getPatientProfile, getMyPrescriptions } from "../../api/api";
import VisitTimeline from "./VisitTimeline";
import "./Dashboard.css";

const calculateAge = (dob) => {
  if (!dob) return "--";
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const Dashboard = ({ user }) => {
  const [visits, setVisits] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [visitsRes, profileRes, presRes] = await Promise.all([
          getMyVisits().catch(() => ({ data: { data: [] } })),
          getPatientProfile().catch(() => ({ data: { data: null } })),
          getMyPrescriptions().catch(() => ({ data: { data: [] } })),
        ]);

        // Index prescriptions by visit_id for quick lookup
        const presMap = {};
        (presRes.data.data || []).forEach(p => {
          const vid = p.visit_id?._id || p.visit_id;
          if (vid) presMap[vid] = p;
        });

        // Transform visits for the timeline
        const visitsData = (visitsRes.data.data || []).map((v, i) => {
          const pres = presMap[v._id] || null;
          return {
            id: v._id || i,
            hospital: v.file_id?.hospital_id?.name || "Unknown Hospital",
            date: v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "--",
            time: v.createdAt ? new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--",
            reason: v.symptoms || v.diagnosis || v.visit_type || "Consultation",
            doctor: v.doctor_id?.name || "Doctor",
            specialty: v.doctor_id?.specialization || "General",
            status: v.status || "Completed",
            notes: v.notes || "",
            // Prescription data
            medicines: pres?.medicines || [],
            pharmacy: pres?.pharmacy || null,
            diagnosis: pres?.diagnosis_summary || "",
            doctorNotes: pres?.doctor_notes || "",
            hasPrescription: !!pres,
          };
        });
        setVisits(visitsData);
        setProfile(profileRes.data.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const age = calculateAge(profile?.dateOfBirth || user?.dateOfBirth || user?.dob);
  const firstName = user?.name?.split(" ")[0] || user?.firstName || "Patient";
  const bloodGroup = profile?.bloodGroup || user?.bloodGroup || user?.blood || "Not set";

  return (
    <motion.div className="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Greeting */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Hello, {firstName}</h1>
        <p className="dashboard-subtitle">Here's your health summary</p>
      </div>

      {/* Age + Blood Group */}
      <div className="summary-row">
        <div className="summary-card">
          <div className="summary-icon-wrap" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
            <FiUser size={22} />
          </div>
          <div>
            <p className="summary-label">Age</p>
            <p className="summary-value">{age} <span className="summary-unit">years</span></p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrap" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
            <FiDroplet size={22} />
          </div>
          <div>
            <p className="summary-label">Blood Group</p>
            <p className="summary-value">{bloodGroup}</p>
          </div>
        </div>
      </div>

      {/* Hospital Visits */}
      <div className="detail-card">
        <div className="detail-card-header">
          <div className="detail-icon-wrap" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
            <FiActivity size={18} />
          </div>
          <h2 className="detail-card-title">Hospital Visits</h2>
          <span style={{ marginLeft: "auto", fontSize: 12 }}>
            {loading ? "Loading..." : `${visits.length} total`}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569" }}>
            <p>Loading visits...</p>
          </div>
        ) : (
          <VisitTimeline visits={visits} />
        )}
      </div>
    </motion.div>
  );
};

export default Dashboard;
