import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Search, UserPlus, UserCheck } from 'lucide-react';
import { userApi, followApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { useEffect } from 'react';

function AvatarPlaceholder({ name, size = 44 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

function UserCard({ user: u, currentUserId }) {
  const navigate = useNavigate();
  const [following, setFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  useEffect(() => {
    if (u.id !== currentUserId) {
      followApi.isFollowing(u.id).then(r => setFollowing(r.data.following)).catch(() => {});
    }
  }, [u.id, currentUserId]);

  const handleFollow = async (e) => {
    e.stopPropagation();
    setLoadingFollow(true);
    try {
      const { data } = await followApi.toggle(u.id);
      setFollowing(data.following);
      toast.success(data.following ? `Following @${u.username}!` : `Unfollowed @${u.username}`);
    } catch {
      toast.error('Could not update follow');
    } finally {
      setLoadingFollow(false);
    }
  };

  return (
    <div
      className="card"
      style={{ padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
      onClick={() => navigate(`/user/${u.username}`)}
    >
      {u.profilePicture
        ? <img src={u.profilePicture} className="avatar avatar-md" alt={u.name} />
        : <AvatarPlaceholder name={u.name} />
      }
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{u.username}</div>
        {u.bio && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{u.bio}</div>}
      </div>
      {u.id !== currentUserId && (
        <button
          className={`btn ${following ? 'btn-secondary' : 'btn-primary'}`}
          style={{ fontSize: 13, padding: '8px 16px' }}
          onClick={handleFollow}
          disabled={loadingFollow}
        >
          {loadingFollow
            ? <span className="spinner" style={{ width: 14, height: 14 }} />
            : following
            ? <><UserCheck size={14} /> Following</>
            : <><UserPlus size={14} /> Follow</>
          }
        </button>
      )}
    </div>
  );
}

export default function SearchPage() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedKeyword = useDebounce(keyword, 400);

  useEffect(() => {
    if (!debouncedKeyword.trim()) { setResults([]); return; }
    setLoading(true);
    userApi.search(debouncedKeyword)
      .then(r => setResults(r.data))
      .catch(() => toast.error('Search failed'))
      .finally(() => setLoading(false));
  }, [debouncedKeyword]);

  return (
    <div className="content-wrapper">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, fontFamily: 'Outfit' }}>
        Find People
      </h1>

      <div className="search-input-container" style={{ marginBottom: 24 }}>
        <Search size={18} className="search-icon" />
        <input
          className="search-input"
          placeholder="Search by name or username..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
      </div>

      {loading && (
        <div className="flex justify-center" style={{ padding: 32 }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      )}

      {!loading && keyword && results.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p className="text-muted">No users found for "{keyword}"</p>
        </div>
      )}

      {!loading && !keyword && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p className="text-muted">Type a name or username to find people</p>
        </div>
      )}

      {results.map(u => (
        <UserCard key={u.id} user={u} currentUserId={user?.id} />
      ))}
    </div>
  );
}
