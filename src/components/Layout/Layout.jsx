import React from 'react';
import Sidebar from '../Sidebar';
import './Layout.css';

const Layout = ({ children, user, onLogout }) => {
  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
