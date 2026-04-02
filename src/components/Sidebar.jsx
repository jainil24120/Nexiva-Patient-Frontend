import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid,
  FiActivity,
  FiFileText,
  FiAlertCircle,
  FiUser,
  FiMenu,
  FiHeart,
  FiClipboard
} from 'react-icons/fi';
import './Sidebar.css';
import { LuLogOut } from 'react-icons/lu';

const Sidebar = ({ user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const userName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "Guest Patient");
  const userAvatar = user?.avatar || localStorage.getItem("userAvatar") || "";

  const menuItems = [
    { path: '/', name: 'Dashboard', icon: <FiGrid /> },
    { path: '/hospitals', name: 'Hospitals', icon: <FiActivity /> },
    { path: '/prescriptions', name: 'Prescriptions', icon: <FiClipboard /> },
    { path: '/reports', name: 'Reports', icon: <FiFileText /> },
    { path: '/allergies', name: 'Allergies', icon: <FiAlertCircle /> },
    { path: '/profile', name: 'Profile', icon: <FiUser /> }
  ];

  const sidebarVariants = {
    expanded: { width: 260 },
    collapsed: { width: 80 }
  };

  return (
    <motion.div 
      className="sidebar"
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Logo Section */}
      <div className="sidebar-header">
        <motion.div className="logo-container">
          <img src='../src/assets/logo.png' alt="NEXIVA Logo" className="auth-logo-img" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                className="logo-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                NEXIVA
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Desktop Collapse Button */}
        <button 
          className="collapse-btn desktop-only"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <FiMenu />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span 
                  className="nav-text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout button */}
      <div className="sidebar-footer">
        <div className="user-card" style={{ marginBottom: '12px', opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.3s' }}>
          {userAvatar ? (
            <img src={userAvatar} alt="User Avatar" className="user-avatar" />
          ) : (
            <div className="user-avatar-initial">{(userName || "P").charAt(0).toUpperCase()}</div>
          )}
          {!isCollapsed && (
            <div className="user-info">
              <p className="user-name">{userName}</p>
              <p className="user-role">Patient</p>
            </div>
          )}
        </div>

        <button 
          className="nav-item logout-btn"
          onClick={() => {
            localStorage.removeItem('patientToken');
            localStorage.removeItem('patientProfile');
            localStorage.removeItem('token');
            localStorage.removeItem('userProfile');
            localStorage.removeItem('userAvatar');
            if (onLogout) onLogout();
            else window.location.reload();
          }}
        >
          <span className="nav-icon"><LuLogOut /></span>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                className="nav-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;