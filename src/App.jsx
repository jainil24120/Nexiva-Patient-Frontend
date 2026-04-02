import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import Hospitals from './components/Hospitals/Hospitals';
import Reports from './components/Reports/Reports';
import Allergies from './components/Allergies/Allergies';
import Prescriptions from './components/Prescriptions/Prescriptions';
import Profile from './components/Profile/Profile';
import Auth from './components/Auth/Auth';
import { getMe, getPatientProfile } from './api/api';
import './styles/globals.css';

const TOKEN_KEY = 'patientToken';
const PROFILE_KEY = 'patientProfile';

function withAvatar(userData) {
  if (!userData) return userData;
  const savedAvatar = localStorage.getItem('userAvatar');
  if (savedAvatar && !userData.avatar) {
    userData.avatar = savedAvatar;
  }
  return userData;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
  // Also clear legacy keys
  localStorage.removeItem('token');
  localStorage.removeItem('userProfile');
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check patient-specific token first, fallback to legacy 'token'
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      // Migrate from legacy 'token' if it's a patient token
      token = localStorage.getItem('token');
    }

    if (!token) {
      clearSession();
      setLoading(false);
      return;
    }

    // Temporarily set token for the API call
    localStorage.setItem('token', token);

    getMe()
      .then(async (res) => {
        const userData = res.data.data;

        // CRITICAL: Verify this is a patient account
        if (userData.role && userData.role !== 'patient') {
          clearSession();
          setUser(null);
          return;
        }

        // Fetch patient profile to get avatar from DB
        try {
          const profileRes = await getPatientProfile();
          const profile = profileRes.data.data;
          if (profile?.avatar) {
            userData.avatar = profile.avatar;
            localStorage.setItem('userAvatar', profile.avatar);
          }
        } catch {}

        const merged = withAvatar(userData);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
        localStorage.setItem('token', token); // keep for API calls
        setUser(merged);
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          // Token is invalid or wrong role — force login
          clearSession();
          setUser(null);
        } else {
          // Network error — try cached profile but ONLY if it's a patient
          try {
            const cached = localStorage.getItem(PROFILE_KEY);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.role && parsed.role !== 'patient') throw new Error('wrong role');
              setUser(withAvatar(parsed));
            } else {
              clearSession();
            }
          } catch {
            clearSession();
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAuthenticated = async (userData, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('token', token); // for API interceptor
    // Fetch patient profile for avatar
    try {
      const profileRes = await getPatientProfile();
      const profile = profileRes.data.data;
      if (profile?.avatar) {
        userData.avatar = profile.avatar;
        localStorage.setItem('userAvatar', profile.avatar);
      }
    } catch {}
    localStorage.setItem(PROFILE_KEY, JSON.stringify(userData));
    setUser(withAvatar(userData));
  };

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem('userAvatar');
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    const avatar = updatedUser.avatar || localStorage.getItem('userAvatar') || user?.avatar;
    const merged = { ...user, ...updatedUser, avatar };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
    if (avatar) localStorage.setItem('userAvatar', avatar);
    setUser(merged);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#64748b' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/hospitals" element={<Hospitals />} />
          <Route path="/prescriptions" element={<Prescriptions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/allergies" element={<Allergies />} />
          <Route path="/profile" element={<Profile user={user} onUpdate={handleUserUpdate} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
