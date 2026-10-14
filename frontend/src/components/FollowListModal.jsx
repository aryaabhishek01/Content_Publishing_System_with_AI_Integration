import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Search, UserCheck, UserPlus, UserX, Users } from 'lucide-react';
import { followApi, userApi } from '../api';
import { useAuth } from '../context/AuthContext';

function AvatarPlaceholder({ name, size = 44 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function FollowListModal({
  isOpen,
  onClose,
  initialType = 'followers', // 'followers' | 'following'
  userId,
  profileUsername,
  isOwnProfile = false,
  followerCount = 0,
  followingCount = 0,
  onCountsChange,
}) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(initialType);
  const [users, setUsers] = useState([]);
  const [myFollowingIds, setMyFollowingIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingMap, setActionLoadingMap] = useState({});

  // Reset tab when initialType changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType);
      setSearchQuery('');
    }
  }, [isOpen, initialType]);

  // Load followers or following list
  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        // Fetch target user's followers or following IDs
        const idsPromise = activeTab === 'followers'
          ? followApi.getFollowers(userId)
          : followApi.getFollowing(userId);

        // Fetch current user's following list (to know who we already follow)
        const myFollowingPromise = currentUser?.id
          ? followApi.getFollowing(currentUser.id)
          : Promise.resolve({ data: [] });

        const [targetRes, myRes] = await Promise.all([idsPromise, myFollowingPromise]);

        if (!isMounted) return;

        const targetIds = targetRes.data || [];
        const myFollows = new Set(myRes.data || []);
        setMyFollowingIds(myFollows);

        if (targetIds.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        // Batch fetch user details
        const usersRes = await userApi.getBatch(targetIds);
        if (isMounted) {
          setUsers(usersRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load follow list:', err);
        if (isMounted) {
          toast.error('Could not load user list');
          setUsers([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, activeTab, currentUser?.id]);

  // Handle removing a follower (only allowed on own profile)
  const handleRemoveFollower = async (targetUser) => {
    setActionLoadingMap(prev => ({ ...prev, [`remove_${targetUser.id}`]: true }));
    try {
      const res = await followApi.removeFollower(targetUser.id);
      setUsers(prev => prev.filter(u => u.id !== targetUser.id));

      if (onCountsChange && res.data) {
        onCountsChange({
          followerCount: res.data.followerCount,
          followingCount: res.data.followingCount,
        });
      }
      toast.success(`Removed @${targetUser.username} from followers`);
    } catch (err) {
      console.error('Failed to remove follower:', err);
      toast.error('Could not remove follower');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [`remove_${targetUser.id}`]: false }));
    }
  };

  // Handle Follow / Unfollow toggle
  const handleToggleFollow = async (targetUser) => {
    const isCurrentlyFollowing = myFollowingIds.has(targetUser.id);
    setActionLoadingMap(prev => ({ ...prev, [`toggle_${targetUser.id}`]: true }));

    try {
      let res;
      if (isCurrentlyFollowing) {
        res = await followApi.unfollow(targetUser.id);
        setMyFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(targetUser.id);
          return next;
        });
        toast.success(`Unfollowed @${targetUser.username}`);
      } else {
        res = await followApi.toggle(targetUser.id);
        setMyFollowingIds(prev => {
          const next = new Set(prev);
          next.add(targetUser.id);
          return next;
        });
        toast.success(`Following @${targetUser.username}!`);
      }

      // Update parent counts if current user is profile owner
      if (isOwnProfile && onCountsChange && res.data) {
        onCountsChange({
          followerCount: res.data.followerCount !== undefined ? res.data.followerCount : followerCount,
          followingCount: res.data.followingCount !== undefined ? res.data.followingCount : followingCount,
        });
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      toast.error('Could not update follow status');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [`toggle_${targetUser.id}`]: false }));
    }
  };

  const handleUserClick = (u) => {
    onClose();
    if (currentUser?.id === u.id) {
      navigate('/profile');
    } else {
      navigate(`/user/${u.username}`);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-accent)',
        }}
      >
        {/* Header Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '12px 18px',
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => setActiveTab('followers')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                fontSize: 16,
                paddingBottom: 4,
                color: activeTab === 'followers' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'followers' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              Followers {activeTab === 'followers' && users.length > 0 && `(${users.length})`}
            </button>
            <button
              onClick={() => setActiveTab('following')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                fontSize: 16,
                paddingBottom: 4,
                color: activeTab === 'following' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'following' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              Following {activeTab === 'following' && users.length > 0 && `(${users.length})`}
            </button>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              padding: 6,
              borderRadius: '50%',
              display: 'flex',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 14,
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Users List */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '55vh', padding: '8px 0' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
              <span className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: 12 }}>
                <Users size={36} style={{ opacity: 0.3 }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {searchQuery
                  ? 'No matching users found'
                  : activeTab === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
              </p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {searchQuery ? 'Try checking for typos or searching by name' : ''}
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isMe = currentUser?.id === u.id;
              const isFollowing = myFollowingIds.has(u.id);
              const toggleLoading = actionLoadingMap[`toggle_${u.id}`];
              const removeLoading = actionLoadingMap[`remove_${u.id}`];

              return (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 18px',
                    gap: 12,
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-glass-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* User info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      flex: 1,
                      minWidth: 0,
                    }}
                    onClick={() => handleUserClick(u)}
                  >
                    {u.profilePicture ? (
                      <img
                        src={u.profilePicture}
                        alt={u.name}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <AvatarPlaceholder name={u.name} size={44} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {u.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        @{u.username}
                      </div>
                      {u.bio && (
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: 2,
                          }}
                        >
                          {u.bio}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {/* Follow / Unfollow Button (not shown for self) */}
                    {!isMe && (
                      <button
                        className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                        style={{
                          fontSize: 12,
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-full)',
                          minWidth: 90,
                          height: 32,
                        }}
                        disabled={toggleLoading}
                        onClick={() => handleToggleFollow(u)}
                      >
                        {toggleLoading ? (
                          <span className="spinner" style={{ width: 12, height: 12 }} />
                        ) : isFollowing ? (
                          <>
                            <UserCheck size={13} style={{ marginRight: 4 }} /> Following
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} style={{ marginRight: 4 }} />
                            {activeTab === 'followers' && isOwnProfile ? 'Follow Back' : 'Follow'}
                          </>
                        )}
                      </button>
                    )}

                    {/* Remove Follower Button (only on own profile in Followers tab, not for self) */}
                    {isOwnProfile && activeTab === 'followers' && !isMe && (
                      <button
                        className="btn btn-secondary"
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-full)',
                          color: '#f87171',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          height: 32,
                        }}
                        disabled={removeLoading}
                        onClick={() => handleRemoveFollower(u)}
                        title="Remove follower"
                      >
                        {removeLoading ? (
                          <span className="spinner" style={{ width: 12, height: 12 }} />
                        ) : (
                          <>
                            <UserX size={13} style={{ marginRight: 4 }} /> Remove
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
