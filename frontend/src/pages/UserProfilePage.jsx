import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { UserPlus, UserCheck, MessageCircle } from 'lucide-react';
import { userApi, postApi, followApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import FollowListModal from '../components/FollowListModal';

function AvatarPlaceholder({ name, size = 96 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

export default function UserProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState(false);
  const [mutual, setMutual] = useState(false);
  const [counts, setCounts] = useState({ followerCount: 0, followingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState('followers');

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: user } = await userApi.getByUsername(username);
      setProfile(user);

      const [postsRes, countsRes, followRes] = await Promise.all([
        postApi.getUserPosts(user.id),
        followApi.getCounts(user.id),
        followApi.isFollowing(user.id),
      ]);

      setPosts(postsRes.data);
      setCounts(countsRes.data);
      setFollowing(followRes.data.following);

      // Check mutual follow for message button
      const { data: mutualData } = await followApi.areMutual(user.id);
      setMutual(mutualData.mutual);
    } catch {
      toast.error('User not found');
      navigate('/search');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const { data } = await followApi.toggle(profile.id);
      setFollowing(data.following);
      setCounts({ followerCount: data.followerCount, followingCount: data.followingCount });
      // Recheck mutual
      const { data: m } = await followApi.areMutual(profile.id);
      setMutual(m.mutual);
    } catch {
      toast.error('Could not update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const isOwnProfile = currentUser?.username === username;

  if (loading) {
    return (
      <div className="content-wrapper">
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="content-wrapper">
      {/* Profile header */}
      <div className="profile-header">
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          {profile.profilePicture
            ? <img src={profile.profilePicture} className="avatar avatar-xl" alt={profile.name} />
            : <AvatarPlaceholder name={profile.name} size={96} />
          }
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit' }}>{profile.name}</h2>
              {!isOwnProfile && (
                <div className="flex gap-2">
                  <button
                    className={`btn ${following ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ fontSize: 13 }}
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {followLoading
                      ? <span className="spinner" style={{ width: 14, height: 14 }} />
                      : following
                      ? <><UserCheck size={14} /> Following</>
                      : <><UserPlus size={14} /> Follow</>
                    }
                  </button>
                  {mutual && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 13 }}
                      onClick={() => navigate('/messages', { state: { targetUserId: profile.id } })}
                    >
                      <MessageCircle size={14} /> Message
                    </button>
                  )}
                </div>
              )}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>@{profile.username}</div>
            {profile.bio && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>{profile.bio}</p>}
          </div>
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

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
          <p className="text-muted">No posts yet</p>
        </div>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} showActions={false} />)
      )}

      {/* Followers / Following Modal */}
      {profile && (
        <FollowListModal
          isOpen={showFollowModal}
          onClose={() => setShowFollowModal(false)}
          initialType={followModalType}
          userId={profile.id}
          profileUsername={profile.username}
          isOwnProfile={currentUser?.id === profile.id}
          followerCount={counts.followerCount || 0}
          followingCount={counts.followingCount || 0}
          onCountsChange={({ followerCount, followingCount }) => {
            setCounts(prev => ({
              followerCount: followerCount !== undefined ? followerCount : prev.followerCount,
              followingCount: followingCount !== undefined ? followingCount : prev.followingCount,
            }));
          }}
        />
      )}
    </div>
  );
}
