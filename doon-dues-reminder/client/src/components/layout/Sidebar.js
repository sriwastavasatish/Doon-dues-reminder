import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const adminNav = [
  { section: 'OVERVIEW', items: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/reports',   icon: '📈', label: 'Reports & Analytics' },
  ]},
  { section: 'MANAGE', items: [
    { to: '/students',  icon: '👨‍🎓', label: 'Students & Dues' },
    { to: '/campaigns', icon: '📅', label: 'Campaigns' },
    { to: '/send',      icon: '💬', label: 'Send Reminders' },
  ]},
  { section: 'ADMIN', items: [
    { to: '/users',     icon: '👥', label: 'Teachers & Users' },
    { to: '/settings',  icon: '⚙️', label: 'Settings' },
  ]},
];

const teacherNav = [
  { section: 'OVERVIEW', items: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  ]},
  { section: 'MY CLASSES', items: [
    { to: '/students',  icon: '👨‍🎓', label: 'My Students' },
    { to: '/send',      icon: '💬', label: 'Send Reminders' },
  ]},
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const nav = isAdmin ? adminNav : teacherNav;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">📱</div>
        <h2>Doon Dues<br/>Reminder</h2>
        <p>School Fee Management</p>
      </div>

      <nav className="sidebar-nav">
        {nav.map(section => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">↩️</button>
        </div>
      </div>
    </aside>
  );
}
