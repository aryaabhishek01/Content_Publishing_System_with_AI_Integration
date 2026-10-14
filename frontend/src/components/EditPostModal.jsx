import { useState, useEffect } from 'react';
import { X, Sparkles, Check, Loader2 } from 'lucide-react';
import { postApi, aiApi } from '../api';
import { toast } from 'react-hot-toast';

export default function EditPostModal({ isOpen, onClose, post, onSaved }) {
  const [description, setDescription] = useState(post?.description || '');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (post) {
      setDescription(post.description || '');
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!description.trim()) {
      toast.error('Description cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const { data } = await postApi.update(post.id, { description: description.trim() });
      toast.success('Post updated successfully!');
      onSaved?.(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update post');
    } finally {
      setSaving(false);
    }
  };

  const handleAiEnhance = async () => {
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="card fade-in"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-card, #12121a)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary, #fff)' }}>
            Edit Post
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #94a3b8)',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Media preview */}
          {post.mediaUrl && (
            <div
              style={{
                width: '100%',
                maxHeight: 220,
                borderRadius: 10,
                overflow: 'hidden',
                background: '#0a0a0f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {post.mediaType === 'VIDEO' ? (
                <video
                  src={post.mediaUrl}
                  controls
                  style={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain' }}
                />
              ) : (
                <img
                  src={post.mediaUrl}
                  alt="post preview"
                  style={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain' }}
                />
              )}
            </div>
          )}

          {/* Description Textarea */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
                Description / Caption
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSpellCheck}
                  disabled={aiLoading || !description.trim() || saving}
                  style={{ fontSize: 11, padding: '4px 10px', height: 'auto', borderRadius: 6 }}
                  title="Check and polish spelling/grammar"
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
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                    borderColor: 'rgba(168, 85, 247, 0.4)',
                    color: '#c084fc',
                  }}
                  title="Enhance or complete with AI"
                >
                  {aiLoading ? (
                    <Loader2 size={12} className="spin" style={{ marginRight: 4 }} />
                  ) : (
                    <Sparkles size={12} style={{ marginRight: 4 }} />
                  )}
                  {aiLoading ? 'Thinking...' : 'AI Enhance'}
                </button>
              </div>
            </div>

            <textarea
              className="input"
              rows={5}
              placeholder="What's on your mind? Share your story..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              style={{
                resize: 'vertical',
                lineHeight: 1.5,
                fontSize: 14,
                width: '100%',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
              {description.length} characters
            </div>
          </div>

          {/* Categories tag display if existing */}
          {post.categories?.length > 0 && (
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginBottom: 6, display: 'block' }}>
                Categories:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {post.categories.map((c) => (
                  <span
                    key={c.id || c.name}
                    className="post-category-tag"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                  >
                    #{c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
            style={{ borderRadius: 8, padding: '8px 16px', fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !description.trim()}
            style={{ borderRadius: 8, padding: '8px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
