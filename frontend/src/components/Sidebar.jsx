import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import {
  Home, PlusSquare, Search, MessageCircle, Bell, User,
  LogOut, Shield, MessageSquare
} from 'lucide-react';
import { notificationApi } from '../api';

const NAV_ITEMS_USER = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: PlusSquare, label: 'Create Post', path: '/create' },
  { icon: Search, label: 'Find People', path: '/search' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
];

const NAV_ITEMS_ADMIN = [
  { icon: Shield, label: 'Dashboard', path: '/admin' },
  { icon: Home, label: 'Feed', path: '/home' },
  { icon: MessageSquare, label: 'Feedback', path: '/admin/feedback' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
];

function AvatarPlaceholder({ name, size = 36 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) {
      notificationApi.getCount()
        .then(r => setNotifCount(r.data.count || 0))
        .catch(() => {});
    }
    const interval = setInterval(() => {
      if (!isAdmin) {
        notificationApi.getCount()
          .then(r => setNotifCount(r.data.count || 0))
          .catch(() => {});
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const navItems = isAdmin ? NAV_ITEMS_ADMIN : NAV_ITEMS_USER;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">✦ ContentHub</div>

      <div className="sidebar-nav">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          const showBadge = label === 'Notifications' && notifCount > 0;
          return (
            <div
              key={path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={20} className="nav-icon" />
              <span>{label}</span>
              {showBadge && <span className="nav-badge">{notifCount > 99 ? '99+' : notifCount}</span>}
            </div>
          );
        })}

        <div style={{ flex: 1 }} />

        <div className="nav-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
          <LogOut size={20} className="nav-icon" />
          <span>Sign Out</span>
        </div>
      </div>

      <div className="sidebar-user" onClick={() => navigate(isAdmin ? '/admin' : '/profile')}>
        {user?.profilePicture ? (
          <img src={user.profilePicture} alt={user.name} className="avatar avatar-sm" />
        ) : (
          <AvatarPlaceholder name={user?.name} size={36} />
        )}
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-handle">@{user?.username}</div>
        </div>
        {isAdmin && <Shield size={14} color="var(--accent-secondary)" />}
      </div>
    </nav>
  );
}
