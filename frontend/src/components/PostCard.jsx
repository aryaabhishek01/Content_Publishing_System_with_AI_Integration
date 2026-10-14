import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit2, Send, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { postApi, aiApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import EditPostModal from './EditPostModal';

/**
 * Instagram-style smart timestamp:
 * < 60s  → "just now"
 * < 60m  → "2m"
 * < 24h  → "3h"
 * < 7d   → "2d"
 * same year → "Jan 14"
 * older  → "Jan 14, 2023"
 */
function smartTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const secs = differenceInSeconds(now, date);
  if (secs < 60) return 'just now';
  const mins = differenceInMinutes(now, date);
  if (mins < 60) return `${mins}m`;
  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h`;
  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d`;
  if (date.getFullYear() === now.getFullYear()) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

function fullTime(dateStr) {
  if (!dateStr) return '';
  return format(new Date(dateStr), "MMMM d, yyyy 'at' h:mm a");
}

function AvatarPlaceholder({ name, size = 44 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

export default function PostCard({
  post,
  onDelete,
  onUpdate,
  showActions = true,
  allowEdit = true,
  allowDelete = true,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentPost, setCurrentPost] = useState(post);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCurrentPost(post);
    setLikeCount(post.likeCount || 0);
  }, [post]);

  const isOwner = user?.id === currentPost.userId;
  const authorName = currentPost.authorName || (isOwner ? user?.name : (currentPost.username ? `@${currentPost.username}` : 'User'));
  const authorUsername = currentPost.username || (isOwner ? user?.username : null);
  const authorAvatar = currentPost.authorProfilePicture || (isOwner ? user?.profilePicture : null);

  const handleAuthorClick = () => {
    if (isOwner) {
      navigate('/profile');
    } else if (authorUsername) {
      navigate(`/user/${authorUsername}`);
    } else if (currentPost.userId) {
      navigate(`/user/${currentPost.userId}`);
    }
  };

  const handleLike = async () => {
    try {
      const { data } = await postApi.toggleLike(currentPost.id);
      setLiked(data.liked);
      setLikeCount(data.likeCount);
      // Record behavior for AI relevance agent
      if (data.liked && currentPost.categories?.length > 0) {
        aiApi.recordBehavior({ postId: currentPost.id, categoryId: currentPost.categories[0]?.id, action: 'LIKE' })
          .catch(() => {});
      }
    } catch {
      toast.error('Could not update like');
    }
  };

  const loadComments = async () => {
    try {
      const { data } = await postApi.getComments(currentPost.id);
      setComments(data);
    } catch {}
  };

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) loadComments();
    setShowComments(!showComments);
    // Record view behavior
    if (currentPost.categories?.length > 0) {
      aiApi.recordBehavior({ postId: currentPost.id, categoryId: currentPost.categories[0]?.id, action: 'VIEW' })
        .catch(() => {});
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const { data } = await postApi.addComment(currentPost.id, commentText);
      setComments(p => [data, ...p]);
      setCommentText('');
    } catch {
      toast.error('Could not post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await postApi.delete(currentPost.id);
      toast.success('Post deleted successfully');
      setShowDeleteModal(false);
      onDelete?.(currentPost.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete post');
    } finally {
      setDeleting(false);
    }
  };

  const handlePostUpdated = (updated) => {
    setCurrentPost(prev => ({ ...prev, ...updated }));
    onUpdate?.(updated);
  };

  return (
    <>
      <div className="post-card fade-in">
        {/* Header */}
        <div className="post-header">
          <div style={{ cursor: 'pointer' }} onClick={handleAuthorClick}>
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt={authorName}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <AvatarPlaceholder name={authorName} size={44} />
            )}
          </div>
          <div className="post-user-info">
            <div
              className="post-username"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleAuthorClick}
            >
              <span>{authorName}</span>
              {authorUsername && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>
                  @{authorUsername}
                </span>
              )}
            </div>
            <div
              className="post-time"
              title={fullTime(currentPost.createdAt)}
              style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Clock size={11} style={{ opacity: 0.6 }} />
              {smartTime(currentPost.createdAt)}
            </div>
          </div>

          {/* Action Menu (Edit / Delete) */}
          {isOwner && showActions && (allowEdit || allowDelete) && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn-ghost"
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  display: 'flex',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
                aria-label="More options"
              >
                <MoreHorizontal size={18} color="var(--text-muted)" />
              </button>

              {showMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 15 }}
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className="card"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 36,
                      zIndex: 20,
                      minWidth: 150,
                      padding: 6,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      borderRadius: 12,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card, #12121a)',
                    }}
                  >
                    {allowEdit && (
                      <button
                        className="nav-item"
                        onClick={() => {
                          setShowMenu(false);
                          setShowEditModal(true);
                        }}
                        style={{
                          width: '100%',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Edit2 size={15} /> Edit Post
                      </button>
                    )}
                    {allowDelete && (
                      <button
                        className="nav-item"
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteModal(true);
                        }}
                        style={{
                          width: '100%',
                          color: '#ef4444',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={15} /> Delete Post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Media */}
        {currentPost.mediaUrl && (
          <div className="post-media-container">
            {currentPost.mediaType === 'VIDEO' ? (
              <video className="post-media" controls src={currentPost.mediaUrl} />
            ) : (
              <img className="post-media" src={currentPost.mediaUrl} alt="post" loading="lazy" />
            )}
          </div>
        )}

        {/* Body */}
        <div className="post-body">
          {currentPost.description && (
            <p className="post-description" style={{ whiteSpace: 'pre-wrap' }}>
              {currentPost.description}
            </p>
          )}
          {currentPost.categories?.length > 0 && (
            <div className="post-categories">
              {currentPost.categories.map(c => (
                <span key={c.id || c.name} className="post-category-tag">#{c.name}</span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="post-actions">
          <button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button className="post-action-btn" onClick={handleToggleComments}>
            <MessageCircle size={18} />
            {currentPost.commentCount > 0 && <span>{currentPost.commentCount}</span>}
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="comments-section">
            <form className="comment-input-row" onSubmit={handleComment}>
              <AvatarPlaceholder name={user?.name} size={32} />
              <input
                className="comment-input"
                placeholder="Write a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }} disabled={commentLoading}>
                {commentLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Send size={14} />}
              </button>
            </form>
            {comments.map(c => {
              const isMe = c.userId === user?.id;
              const cName = c.authorName || (isMe ? user?.name : (c.username ? `@${c.username}` : 'User'));
              const cUsername = c.username || (isMe ? user?.username : null);
              const cAvatar = c.authorProfilePicture || (isMe ? user?.profilePicture : null);
              return (
                <div key={c.id} className="comment-item">
                  <div style={{ cursor: 'pointer' }} onClick={() => cUsername && navigate(`/user/${cUsername}`)}>
                    {cAvatar ? (
                      <img src={cAvatar} alt={cName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <AvatarPlaceholder name={cName} size={32} />
                    )}
                  </div>
                  <div className="comment-content">
                    <div className="comment-user" style={{ cursor: 'pointer' }} onClick={() => cUsername && navigate(`/user/${cUsername}`)}>
                      {cName} {cUsername && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>@{cUsername}</span>}
                    </div>
                    <div className="comment-text">{c.content}</div>
                    {c.createdAt && (
                      <div
                        style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}
                        title={fullTime(c.createdAt)}
                      >
                        {smartTime(c.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        post={currentPost}
        onSaved={handlePostUpdated}
      />

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
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
            if (e.target === e.currentTarget && !deleting) setShowDeleteModal(false);
          }}
        >
          <div
            className="card fade-in"
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'var(--bg-card, #12121a)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 16,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              padding: 24,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                Delete Post?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this post? This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{ flex: 1, borderRadius: 8, padding: '10px 0', fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  padding: '10px 0',
                  fontSize: 14,
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
