import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Send, MessageSquare, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { feedbackApi, aiApi } from '../api';
import { formatDistanceToNow } from 'date-fns';

export default function FeedbackPage() {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [myFeedback, setMyFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [replies, setReplies] = useState({});
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadMyFeedback();
  }, []);

  const loadMyFeedback = async () => {
    setLoading(true);
    try {
      const { data } = await feedbackApi.getMy();
      setMyFeedback(data);
    } catch {}
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { toast.error('Message cannot be empty'); return; }
    setSubmitting(true);
    try {
      await feedbackApi.submit(form);
      toast.success('Feedback submitted! We\'ll get back to you. 📨');
      setForm({ subject: '', message: '' });
      loadMyFeedback();
    } catch {
      toast.error('Could not submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiMessage = async () => {
    if (!form.subject.trim() && !form.message.trim()) {
      toast.error('Enter a subject first so AI can write relevant feedback');
      return;
    }
    setAiLoading(true);
    try {
      const { data } = await aiApi.generateFeedbackMessage(form.subject || form.message);
      setForm(p => ({ ...p, message: data.message }));
      toast.success('✨ AI wrote your feedback message!');
    } catch {
      toast.error('AI service unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const loadReplies = async (feedbackId) => {
    if (expandedId === feedbackId) { setExpandedId(null); return; }
    setExpandedId(feedbackId);
    if (!replies[feedbackId]) {
      try {
        const { data } = await feedbackApi.getReplies(feedbackId);
        setReplies(p => ({ ...p, [feedbackId]: data }));
      } catch {}
    }
  };

  return (
    <div className="content-wrapper">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, fontFamily: 'Outfit' }}>Feedback</h1>

      {/* Submit feedback */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <MessageSquare size={20} color="var(--accent-secondary)" />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Send Feedback to Admin</h3>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="input-group">
            <label className="input-label">Subject (optional — helps AI write better)</label>
            <input className="input" placeholder="e.g. Bug report, Feature request, Appreciation..."
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
          </div>
          <div className="input-group">
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <label className="input-label" style={{ margin: 0 }}>Message *</label>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={handleAiMessage}
                disabled={aiLoading}
              >
                {aiLoading
                  ? <span className="spinner" style={{ width: 12, height: 12 }} />
                  : <Wand2 size={12} />}
                {form.message.trim() ? 'Rewrite with AI' : 'Write with AI'}
              </button>
            </div>
            <textarea className="input" rows={5}
              placeholder="Tell us what you think... (or use AI to write based on your subject)"
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
            {submitting ? <span className="spinner" /> : <><Send size={14} /> Submit Feedback</>}
          </button>
        </form>
      </div>

      {/* My feedback history */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: 'Outfit' }}>My Feedback History</h2>
      {loading ? (
        <div className="flex justify-center" style={{ padding: 32 }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : myFeedback.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="text-muted">No feedback submitted yet</p>
        </div>
      ) : (
        myFeedback.map(fb => (
          <div key={fb.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div>
                {fb.subject && <div style={{ fontWeight: 600, fontSize: 15 }}>{fb.subject}</div>}
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {fb.createdAt ? formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true }) : ''}
                </div>
              </div>
              <span className={`badge ${fb.status === 'REPLIED' ? 'badge-green' : 'badge-purple'}`}>
                {fb.status}
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>{fb.message}</p>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => loadReplies(fb.id)}>
              {expandedId === fb.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {fb.status === 'REPLIED' ? 'View Reply' : 'Check Updates'}
            </button>

            {expandedId === fb.id && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                {(replies[fb.id] || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No replies yet</p>
                ) : (
                  (replies[fb.id] || []).map(r => (
                    <div key={r.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: 4 }}>
                        🛡️ Admin replied:
                      </div>
                      <p style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{r.reply}</p>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
