import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Filter, TrendingUp, Users, Search, X } from 'lucide-react';
import PostCard from '../components/PostCard';
import { postApi, followApi, aiApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filter state
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);

  // Category search
  const [catSearch, setCatSearch] = useState('');

  useEffect(() => {
    postApi.getCategories().then(r => setCategories(r.data)).catch(() => {});
    if (user?.id) {
      followApi.getFollowing(user.id).then(r => setFollowingIds(r.data)).catch(() => {});
    }
  }, [user?.id]);

  const loadPosts = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    setLoading(true);
    try {
      const currentPage = reset ? 0 : page;
      const params = { page: currentPage, size: 10 };

      if (selectedCategories.length > 0) {
        params.categoryIds = selectedCategories;
      } else if (showFollowingOnly && followingIds.length > 0) {
        params.followedUserIds = followingIds;
      }

      const { data } = await postApi.getFeed(params);
      const newPosts = data.content || [];

      setPosts(reset ? newPosts : p => [...p, ...newPosts]);
      setHasMore(!data.last);
      if (!reset) setPage(p => p + 1);
      else setPage(1);
    } catch {
      toast.error('Could not load feed');
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, selectedCategories, showFollowingOnly, followingIds]);

  useEffect(() => {
    loadPosts(true);
  }, [selectedCategories, showFollowingOnly]);

  const toggleCategory = (id) => {
    setSelectedCategories(p =>
      p.includes(id) ? p.filter(c => c !== id) : [...p, id]
    );
  };

  const handleDeletePost = (postId) => {
    setPosts(p => p.filter(post => post.id !== postId));
  };

  // Filter categories by search text
  const filteredCategories = catSearch.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : categories;

  const hasActiveFilters = selectedCategories.length > 0;

  return (
    <div className="content-wrapper">
      {/* Filter bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <Filter size={16} color="var(--text-muted)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Filter Feed</span>
          {hasActiveFilters && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600 }}>
              {selectedCategories.length} filter{selectedCategories.length > 1 ? 's' : ''} active
            </span>
          )}
        </div>

        {/* Following / Latest toggle */}
        <div className="flex gap-2" style={{ marginBottom: 14 }}>
          <button
            className={`btn ${!showFollowingOnly ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={() => setShowFollowingOnly(false)}
          >
            <TrendingUp size={14} /> Latest
          </button>
          <button
            className={`btn ${showFollowingOnly ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={() => setShowFollowingOnly(true)}
            disabled={followingIds.length === 0}
          >
            <Users size={14} /> Following
          </button>
        </div>

        {/* Category search input */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none'
          }} />
          <input
            className="input"
            style={{ paddingLeft: 36, paddingRight: catSearch ? 36 : 12, fontSize: 13, height: 36 }}
            placeholder="Search categories…"
            value={catSearch}
            onChange={e => setCatSearch(e.target.value)}
          />
          {catSearch && (
            <button
              onClick={() => setCatSearch('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="category-chips" style={{ maxHeight: 100, overflowY: 'auto' }}>
          {filteredCategories.length === 0 && catSearch ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No categories match "{catSearch}"
            </span>
          ) : (
            filteredCategories.map(c => (
              <span
                key={c.id}
                className={`category-chip ${selectedCategories.includes(c.id) ? 'selected' : ''}`}
                onClick={() => toggleCategory(c.id)}
              >
                {c.name}
              </span>
            ))
          )}
          {hasActiveFilters && (
            <span
              className="category-chip"
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
              onClick={() => setSelectedCategories([])}
            >
              ✕ Clear filters
            </span>
          )}
        </div>
      </div>

      {/* Posts */}
      {loading && posts.length === 0 ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div className="flex gap-3 items-center" style={{ marginBottom: 12 }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 6, borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 12, width: '25%', borderRadius: 4 }} />
              </div>
            </div>
            <div className="skeleton" style={{ height: 300, borderRadius: 12, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
          </div>
        ))
      ) : posts.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
          <h3 style={{ marginBottom: 8 }}>No posts yet</h3>
          <p className="text-muted text-sm">
            {selectedCategories.length > 0
              ? 'No posts in selected categories. Try a different filter.'
              : showFollowingOnly
              ? 'Follow people to see their posts here'
              : 'Be the first to post something!'}
          </p>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard key={post.id} post={post} onDelete={handleDeletePost} allowEdit={false} />
          ))}
          {hasMore && (
            <button
              className="btn btn-secondary w-full"
              onClick={() => loadPosts()}
              disabled={loading}
              style={{ marginTop: 8, marginBottom: 24 }}
            >
              {loading ? <span className="spinner" /> : 'Load More'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
