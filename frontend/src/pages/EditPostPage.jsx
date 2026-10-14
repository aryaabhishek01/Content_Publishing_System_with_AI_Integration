import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Sparkles, Check, Loader2, Save } from 'lucide-react';
import { postApi, aiApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function EditPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    postApi.getPost(id)
      .then(res => {
        const p = res.data;
        if (user && p.userId !== user.id) {
          toast.error('You are not authorized to edit this post');
          navigate('/profile');
          return;
        }
        setPost(p);
        setDescription(p.description || '');
      })
      .catch(() => {
        toast.error('Post not found or could not be loaded');
        navigate('/profile');
      })
      .finally(() => setLoading(false));
  }, [id, user, navigate]);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!description.trim()) {
      toast.error('Description cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await postApi.update(id, { description: description.trim() });
      toast.success('Post updated successfully!');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update post');
    } finally {
      setSaving(false);
    }
  };

  const handleAiEnhance = async () => {
    if (!post) return;
    setAiLoading(true);
    try {
      const mood = post.mood || 'INSPIRATIONAL';
      const categories = post.categories?.map(c => c.name) || [];
      const mediaType = post.mediaType || 'PHOTO';

      const { data } = await aiApi.generateDescription({
        mood,
        categories,
        mediaType,
        userText: description.trim() || undefined,
      });

      if (data?.suggested) {
        setDescription(data.suggested);
        toast.success(description.trim() ? '✨ AI enhanced your description!' : '✨ AI description generated!');
      } else {
        toast.error('AI could not generate suggestions');
      }
    } catch {
      toast.error('AI service temporarily unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSpellCheck = async () => {
    if (!description.trim()) return;
    setAiLoading(true);
    try {
      const { data } = await aiApi.spellCheck(description);
      if (data?.corrected) {
        setDescription(data.corrected);
        toast.success('✨ Grammar and spelling polished!');
      } else {
        toast.success('Looks great! No corrections needed.');
      }
    } catch {
      toast.error('AI service temporarily unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="content-wrapper flex justify-center" style={{ padding: 60 }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="content-wrapper fade-in" style={{ maxWidth: 640 }}>
      <button
        className="btn btn-secondary"
        onClick={() => navigate('/profile')}
        style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
      >
        <ArrowLeft size={16} /> Back to Profile
      </button>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Edit Post</h2>

        {/* Media preview */}
        {post.mediaUrl && (
          <div
            style={{
              width: '100%',
              maxHeight: 320,
              borderRadius: 12,
              overflow: 'hidden',
              background: '#0a0a0f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {post.mediaType === 'VIDEO' ? (
              <video src={post.mediaUrl} controls style={{ maxHeight: 320, maxWidth: '100%', objectFit: 'contain' }} />
            ) : (
              <img src={post.mediaUrl} alt="post" style={{ maxHeight: 320, maxWidth: '100%', objectFit: 'contain' }} />
            )}
          </div>
        )}

        {/* Caption & AI tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Caption / Description
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSpellCheck}
                disabled={aiLoading || !description.trim() || saving}
                style={{ fontSize: 11, padding: '4px 10px', height: 'auto' }}
              >
                <Check size={12} style={{ marginRight: 4 }} /> Fix Grammar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAiEnhance}
                disabled={aiLoading || saving}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  height: 'auto',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                  borderColor: 'rgba(168, 85, 247, 0.4)',
                  color: '#c084fc',
                }}
              >
                {aiLoading ? <Loader2 size={12} className="spin" style={{ marginRight: 4 }} /> : <Sparkles size={12} style={{ marginRight: 4 }} />}
                {aiLoading ? 'Thinking...' : 'AI Enhance'}
              </button>
            </div>
          </div>

          <textarea
            className="input"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            placeholder="Edit your post caption..."
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, color: 'var(--text-muted)' }}>
            {description.length} characters
          </div>
        </div>

        {/* Categories */}
        {post.categories?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Categories:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {post.categories.map((c) => (
                <span key={c.id || c.name} className="post-category-tag">
                  #{c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/profile')}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !description.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
