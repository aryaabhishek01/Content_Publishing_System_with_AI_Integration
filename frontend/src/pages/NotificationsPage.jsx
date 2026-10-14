import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Bell, CheckCheck, Heart, MessageCircle, UserPlus, Sparkles } from 'lucide-react';
import { notificationApi } from '../api';
import { formatDistanceToNow } from 'date-fns';

const NOTIF_ICONS = {
  LIKE: { icon: Heart, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  COMMENT: { icon: MessageCircle, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  FOLLOW: { icon: UserPlus, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  MESSAGE: { icon: MessageCircle, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
};

function formatNotifTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now - d) / 1000);
    if (diffSecs < 60 || diffSecs < -10) return 'just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'recently';
  }
}

function AvatarPlaceholder({ name, size = 42 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications(true);
    const interval = setInterval(() => {
      loadNotifications(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await notificationApi.getAll();
      setNotifications(data);
    } catch {
      if (showLoading) toast.error('Could not load notifications');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markRead();
      setNotifications(p => p.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {}
  };

  const handleNotificationClick = (n) => {
    if (n.type === 'MESSAGE' && n.actorId) {
      navigate('/messages', { state: { targetUserId: n.actorId } });
    } else if (n.type === 'FOLLOW') {
      if (n.actorUsername) navigate(`/user/${n.actorUsername}`);
      else if (n.actorId) navigate(`/user/${n.actorId}`);
    } else if (n.type === 'LIKE' || n.type === 'COMMENT') {
      navigate('/profile');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="content-wrapper">
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div className="flex items-center gap-3">
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit' }}>Notifications</h1>
          {unreadCount > 0 && (
            <span className="badge badge-purple">{unreadCount} new</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={handleMarkAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 14 }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 8, borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 12, width: '25%', borderRadius: 4 }} />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--gradient-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Bell size={36} color="var(--accent-secondary)" />
            </div>
            <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>No notifications yet</h3>
            <p className="text-muted text-sm" style={{ maxWidth: 320, margin: '0 auto' }}>
              When someone likes, comments, or follows you, their activity will appear here in real time.
            </p>
          </div>
        ) : (
          notifications.map(n => {
            const { icon: Icon, color, bg } = NOTIF_ICONS[n.type] || { icon: Bell, color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' };
            const actorName = n.actorName || 'Someone';
            return (
              <div
                key={n.id}
                className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background 0.15s ease',
                }}
                onClick={() => handleNotificationClick(n)}
              >
                {/* Avatar with type badge overlay */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {n.actorProfilePicture ? (
                    <img
                      src={n.actorProfilePicture}
                      alt={actorName}
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <AvatarPlaceholder name={actorName} size={44} />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: bg,
                      border: '2px solid var(--bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={11} color={color} />
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div className="notification-text" style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 600 }}>{n.content}</span>
                  </div>
                  <div className="notification-time" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatNotifTime(n.createdAt)}
                  </div>
                </div>

                {/* Unread indicator */}
                {!n.isRead && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--accent-secondary)',
                      flexShrink: 0,
                      boxShadow: '0 0 8px var(--accent-secondary)',
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
