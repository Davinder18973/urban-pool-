import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, userProfile, updateProfile } = useAuth();

  const menuItems = [
    { icon: '👤', label: 'Profile', path: '/profile' },
    { icon: '🔔', label: 'Notifications', path: '/notifications' },
    { icon: '💳', label: 'Wallet', path: '/wallet' },
    { icon: '🚗', label: 'My Rides', path: '/my-rides' },
    { icon: '⭐', label: 'Promos', path: '/promos' },
    { icon: '⚙️', label: 'Settings', path: '/settings' },
    { icon: '❓', label: 'Help', path: '/help' },
  ];

  const dismissNotification = (id) => {
    updateProfile({
      notifications: userProfile.notifications.filter(n => n.id !== id)
    });
  };

  return (
    <>
      <div 
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />
      
      <div className={`sidebar-panel ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="user-profile">
            <div className="avatar-large">
              {userProfile.emoji}
            </div>
            <div className="user-info">
              <h3>{userProfile.name}</h3>
              <p>{user?.email || 'Login to see your profile'}</p>
            </div>
          </div>
          <button className="close-sidebar" onClick={onClose}>×</button>
        </div>

        <div className="sidebar-content">
          <ul className="sidebar-menu">
            {menuItems.map((item, index) => (
              <li key={index}>
                <Link to={item.path} className="sidebar-link" onClick={onClose}>
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-label">{item.label}</span>
                  {item.label === 'Notifications' && userProfile.notifications?.length > 0 && (
                    <span className="menu-badge">{userProfile.notifications.length}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Real-time Notifications Section */}
          <div className="sidebar-section">
            <h4 className="section-title">Latest Alerts</h4>
            <div className="notification-mini-list">
              {userProfile.notifications?.slice(0, 3).map(notif => (
                <div key={notif.id} className={`notif-mini-card ${notif.type}`}>
                  <div className="notif-header">
                    <span className="notif-title">{notif.title}</span>
                    <button className="notif-dismiss" onClick={() => dismissNotification(notif.id)}>×</button>
                  </div>
                  <p className="notif-msg">{notif.message}</p>
                  <span className="notif-time">{notif.time}</span>
                </div>
              ))}
              {(!userProfile.notifications || userProfile.notifications.length === 0) && (
                <p className="empty-text">No new notifications</p>
              )}
            </div>
          </div>

          {/* Real-time My Rides Section */}
          <div className="sidebar-section">
            <h4 className="section-title">My Recent Rides</h4>
            <div className="ride-mini-list">
              {userProfile.rides?.slice(0, 2).map(ride => (
                <div key={ride.id} className="ride-mini-card">
                  <div className="ride-route">
                    <span className="dot start"></span>
                    <span className="location">{ride.from}</span>
                  </div>
                  <div className="ride-route">
                    <span className="dot end"></span>
                    <span className="location">{ride.to}</span>
                  </div>
                  <div className="ride-meta">
                    <span className="ride-status">{ride.status}</span>
                    <span className="ride-date">{ride.date}</span>
                  </div>
                </div>
              ))}
              {(!userProfile.rides || userProfile.rides.length === 0) && (
                <p className="empty-text">No rides booked yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          {user ? (
            <button className="sidebar-logout" onClick={() => { logout(); onClose(); }}>
              Log Out
            </button>
          ) : (
            <Link to="/login" className="sidebar-login" onClick={onClose}>
              Log In
            </Link>
          )}
          <div className="sidebar-app-info">
            <span>UrbanPool v1.2</span>
          </div>
        </div>
      </div>
    </>
  );
}
