import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Camera, Edit2, Save, X, Grid3X3, List, Users, Heart, MessageCircle, Clock } from 'lucide-react';
import { userApi, postApi, followApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import FollowListModal from '../components/FollowListModal';
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

function AvatarPlaceholder({ name, size = 96 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

/** Instagram-style smart timestamp */
function smartTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const secs = differenceInSeconds(now, date);
  if (secs < 60) return 'just now';
  const mins = differenceInMinutes(now, date);
  if (mins < 60) return `${mins}m ago`;
  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d ago`;
  if (date.getFullYear() === now.getFullYear()) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

function fullTime(dateStr) {
  if (!dateStr) return '';
  return format(new Date(dateStr), "MMMM d, yyyy 'at' h:mm a");
}

/** Single grid tile with hover overlay showing likes, comments, and time */
function GridTile({ post, onClick }) {
  const [hovered, setHovered] = useState(false);
  const hasMedia = !!post.mediaUrl;
  const bg = hasMedia ? post.mediaUrl : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        background: bg ? 'transparent' : 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        transition: 'transform 0.15s',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* Media or text preview */}
      {hasMedia ? (
        post.mediaType === 'VIDEO' ? (
          <video
            src={post.mediaUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
          />
        ) : (
          <img
            src={post.mediaUrl}
            alt="post"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        )
      ) : (
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 12, boxSizing: 'border-box'
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', lineClamp: 4, overflow: 'hidden' }}>
            {post.description}
          </p>
        </div>
      )}

      {/* Hover overlay — Instagram style */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s',
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Heart size={15} fill="white" /> {post.likeCount || 0}
          </span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
            <MessageCircle size={15} fill="white" /> {post.commentCount || 0}
          </span>
        </div>
        {/* Time shown on hover */}
        <div
          style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          title={fullTime(post.createdAt)}
        >
          <Clock size={10} /> {smartTime(post.createdAt)}
        </div>
      </div>

      {/* Video badge */}
      {post.mediaType === 'VIDEO' && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: 'rgba(0,0,0,0.6)', borderRadius: 4,
          padding: '2px 5px', fontSize: 10, color: 'white',
        }}>▶</div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [posts, setPosts] = useState([]);
  const [counts, setCounts] = useState({ followerCount: 0, followingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', bio: user?.bio || '' });
  const [editError, setEditError] = useState('');
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'list'
  const [selectedPost, setSelectedPost] = useState(null); // for grid detail view
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState('followers');

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      postApi.getUserPosts(user.id),
      followApi.getCounts(user.id),
    ]).then(([postsRes, countsRes]) => {
      setPosts(postsRes.data);
      setCounts(countsRes.data);
    }).catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSaveEdit = async () => {
    if (!/^[A-Za-z][A-Za-z ]*$/.test(editForm.name)) {
      setEditError('Name must contain only alphabets and spaces');
      return;
    }
    try {
      const { data } = await userApi.updateMe(editForm);
      updateUser(data);
      setEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Could not update profile');
    }
  };

  const handleProfilePic = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { data } = await userApi.uploadProfilePic(file);
      updateUser({ ...user, profilePicture: data.profilePicture });
      toast.success('Profile picture updated!');
    } catch {
      toast.error('Could not upload picture');
    }
  };

  const handleDeletePost = (postId) => {
    setPosts(p => p.filter(post => post.id !== postId));
    if (selectedPost?.id === postId) {
      setSelectedPost(null);
    }
  };

  const handleUpdatePost = (updatedPost) => {
    setPosts(p => p.map(post => post.id === updatedPost.id ? { ...post, ...updatedPost } : post));
    if (selectedPost?.id === updatedPost.id) {
      setSelectedPost(prev => ({ ...prev, ...updatedPost }));
    }
  };

  return (
    <div className="content-wrapper">
      {/* Profile header */}
      <div className="profile-header">
        <div style={{ position: 'relative', display: 'inline-block', zIndex: 1 }}>
          {user?.profilePicture
            ? <img src={user.profilePicture} className="avatar avatar-xl" alt={user.name} />
            : <AvatarPlaceholder name={user?.name} size={96} />
          }
          <button
            onClick={() => fileRef.current.click()}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              background: 'var(--gradient-main)', border: 'none',
              borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Camera size={14} color="white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleProfilePic} />
        </div>

        <div style={{ marginTop: 16, position: 'relative', zIndex: 1 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
              <input
                className="input"
                value={editForm.name}
                onChange={e => { setEditForm(p => ({ ...p, name: e.target.value })); setEditError(''); }}
                placeholder="Full name"
              />
              {editError && <span className="input-error">⚠ {editError}</span>}
              <textarea
                className="input"
                rows={2}
                value={editForm.bio}
                onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="Bio (optional)"
                style={{ resize: 'none' }}
              />
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={handleSaveEdit}><Save size={14} /> Save</button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit' }}>{user?.name}</h2>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setEditing(true)}>
                  <Edit2 size={13} /> Edit
                </button>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>@{user?.username}</div>
              {user?.bio && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>{user.bio}</p>}
            </>
          )}
        </div>

        <div className="profile-stats" style={{ zIndex: 1, position: 'relative' }}>
          <div className="profile-stat">
            <div className="profile-stat-number">{posts.length}</div>
            <div className="profile-stat-label">Posts</div>
          </div>
          <div
            className="profile-stat clickable"
            onClick={() => { setFollowModalType('followers'); setShowFollowModal(true); }}
            title="View followers list"
          >
            <div className="profile-stat-number">{counts.followerCount || 0}</div>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div
            className="profile-stat clickable"
            onClick={() => { setFollowModalType('following'); setShowFollowModal(true); }}
            title="View following list"
          >
            <div className="profile-stat-number">{counts.followingCount || 0}</div>
            <div className="profile-stat-label">Following</div>
          </div>
        </div>
      </div>

      {/* Tabs — Grid / List */}
      <div className="tabs">
        <div
          className={`tab ${activeTab === 'grid' ? 'active' : ''}`}
          onClick={() => { setActiveTab('grid'); setSelectedPost(null); }}
        >
          <Grid3X3 size={14} style={{ marginRight: 6 }} /> Grid
        </div>
        <div
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => { setActiveTab('list'); setSelectedPost(null); }}
        >
          <List size={14} style={{ marginRight: 6 }} /> Posts
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center" style={{ padding: 40 }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
          <p className="text-muted">No posts yet — share your first moment!</p>
        </div>
      ) : activeTab === 'grid' ? (
        <>
          {/* Instagram-style grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 3,
            marginBottom: 16,
          }}>
            {posts.map(post => (
              <GridTile
                key={post.id}
                post={post}
                onClick={() => setSelectedPost(post)}
              />
            ))}
          </div>

          {/* Expanded post detail */}
          {selectedPost && (
            <div
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
              }}
              onClick={e => { if (e.target === e.currentTarget) setSelectedPost(null); }}
            >
              <div style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Instagram-style posted time above expanded post */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 8, padding: '0 4px',
                }}>
                  <span
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 5 }}
                    title={fullTime(selectedPost.createdAt)}
                  >
                    <Clock size={12} /> Posted {smartTime(selectedPost.createdAt)}
                  </span>
                  <button
                    onClick={() => setSelectedPost(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', fontSize: 22 }}
                  >✕</button>
                </div>
                <PostCard post={selectedPost} onDelete={handleDeletePost} onUpdate={handleUpdatePost} />
              </div>
            </div>
          )}
        </>
      ) : (
        // List view with per-post time
        posts.map(post => (
          <div key={post.id} style={{ marginBottom: 4 }}>
            <PostCard post={post} onDelete={handleDeletePost} onUpdate={handleUpdatePost} />
          </div>
        ))
      )}

      {/* Followers / Following Modal */}
      <FollowListModal
        isOpen={showFollowModal}
        onClose={() => setShowFollowModal(false)}
        initialType={followModalType}
        userId={user?.id}
        profileUsername={user?.username}
        isOwnProfile={true}
        followerCount={counts.followerCount || 0}
        followingCount={counts.followingCount || 0}
        onCountsChange={({ followerCount, followingCount }) => {
          setCounts(prev => ({
            followerCount: followerCount !== undefined ? followerCount : prev.followerCount,
            followingCount: followingCount !== undefined ? followingCount : prev.followingCount,
          }));
        }}
      />
    </div>
  );
}
