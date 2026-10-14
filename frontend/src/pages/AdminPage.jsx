import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Users, MessageSquare, Send, ChevronDown, ChevronUp, Clock, Wand2 } from 'lucide-react';
import { feedbackApi, userApi, aiApi } from '../api';
import { formatDistanceToNow, format } from 'date-fns';

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="admin-stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [replyInputs, setReplyInputs] = useState({});
  const [expandedFeedback, setExpandedFeedback] = useState(null);
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [aiReplyLoading, setAiReplyLoading] = useState({});

  useEffect(() => {
    Promise.all([
      userApi.getAllUsers(),
      feedbackApi.getAll(),
    ]).then(([usersRes, feedbackRes]) => {
      setUsers(usersRes.data);
      setFeedbacks(feedbackRes.data);
    }).catch(() => toast.error('Could not load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const handleReply = async (feedbackId) => {
    const reply = replyInputs[feedbackId];
    if (!reply?.trim()) { toast.error('Reply cannot be empty'); return; }
    try {
      await feedbackApi.reply(feedbackId, reply);
      toast.success('Reply sent!');
      setReplyInputs(p => ({ ...p, [feedbackId]: '' }));
      setFeedbacks(p => p.map(f => f.id === feedbackId ? { ...f, status: 'REPLIED' } : f));
    } catch {
      toast.error('Could not send reply');
    }
  };

  const loadReplies = async (feedbackId) => {
    if (expandedFeedback === feedbackId) { setExpandedFeedback(null); return; }
    setExpandedFeedback(feedbackId);
    try {
      const { data } = await feedbackApi.getReplies(feedbackId);
      setReplies(p => ({ ...p, [feedbackId]: data }));
    } catch {}
  };

  const handleAiReply = async (fb) => {
    setAiReplyLoading(p => ({ ...p, [fb.id]: true }));
    try {
      const { data } = await aiApi.generateAdminReply(fb.subject, fb.message);
      setReplyInputs(p => ({ ...p, [fb.id]: data.reply }));
      toast.success('✨ AI drafted a reply!');
    } catch {
      toast.error('AI service unavailable');
    } finally {
      setAiReplyLoading(p => ({ ...p, [fb.id]: false }));
    }
  };

  const pendingFeedback = feedbacks.filter(f => f.status === 'PENDING').length;

  return (
    <div style={{ width: '100%', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Outfit', background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Admin Dashboard
        </h1>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        <StatCard icon={Users} value={users.length} label="Total Users" color="var(--accent-primary)" />
        <StatCard icon={MessageSquare} value={feedbacks.length} label="Total Feedback" color="var(--accent-pink)" />
        <StatCard icon={Clock} value={pendingFeedback} label="Pending Replies" color="var(--accent-orange)" />
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={14} style={{ marginRight: 6 }} /> Users ({users.length})
        </div>
        <div className={`tab ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>
          <MessageSquare size={14} style={{ marginRight: 6 }} /> Feedback ({pendingFeedback} pending)
        </div>
      </div>

      {/* Users table */}
      {activeTab === 'users' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div className="flex justify-center" style={{ padding: 40 }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Name', 'Username', 'Email', 'Role', 'Status', 'Last Login', 'Joined'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr
                      key={u.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => navigate(`/user/${u.username}`)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>@{u.username}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-purple' : 'badge-blue'}`}>{u.role}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${u.isActive ? 'badge-green' : 'badge-pink'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {u.lastLoggedIn ? formatDistanceToNow(new Date(u.lastLoggedIn), { addSuffix: true }) : 'Never'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Feedback panel */}
      {activeTab === 'feedback' && (
        <div>
          {feedbacks.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <p className="text-muted">No feedback received yet</p>
            </div>
          ) : (
            feedbacks.map(fb => (
              <div key={fb.id} className="card" style={{ padding: 20, marginBottom: 12 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <div>
                    {fb.subject && <div style={{ fontWeight: 700, fontSize: 15 }}>{fb.subject}</div>}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      User #{fb.userId} · {fb.createdAt ? formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true }) : ''}
                    </div>
                  </div>
                  <span className={`badge ${fb.status === 'REPLIED' ? 'badge-green' : 'badge-purple'}`}>{fb.status}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>{fb.message}</p>

                {/* Reply input */}
                <div style={{ marginBottom: 8 }}>
                  <div className="flex gap-2" style={{ marginBottom: 6 }}>
                    <textarea
                      className="input"
                      style={{ flex: 1, resize: 'vertical', minHeight: 60, fontSize: 13 }}
                      placeholder="Type a reply to this user..."
                      value={replyInputs[fb.id] || ''}
                      onChange={e => setReplyInputs(p => ({ ...p, [fb.id]: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                      onClick={() => handleAiReply(fb)}
                      disabled={aiReplyLoading[fb.id]}
                    >
                      {aiReplyLoading[fb.id]
                        ? <span className="spinner" style={{ width: 12, height: 12 }} />
                        : <Wand2 size={12} />}
                      {replyInputs[fb.id]?.trim() ? 'Regenerate Reply' : 'AI Draft Reply'}
                    </button>
                    <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => handleReply(fb.id)}>
                      <Send size={14} /> Send Reply
                    </button>
                  </div>
                </div>

                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => loadReplies(fb.id)}>
                  {expandedFeedback === fb.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  View Replies
                </button>

                {expandedFeedback === fb.id && (
                  <div style={{ marginTop: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    {(replies[fb.id] || []).length === 0
                      ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No replies yet</p>
                      : (replies[fb.id] || []).map(r => (
                          <div key={r.id} style={{ marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--accent-secondary)', fontWeight: 600 }}>You replied: </span>
                            <span style={{ fontSize: 14 }}>{r.reply}</span>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
