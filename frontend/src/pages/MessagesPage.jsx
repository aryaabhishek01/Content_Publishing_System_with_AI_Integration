import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Send, Search, X, UserPlus, UserCheck, MessageSquare, Sparkles, CheckCheck } from 'lucide-react';
import { messageApi, userApi, followApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';

function AvatarPlaceholder({ name, size = 44 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [partners, setPartners] = useState([]);
  const [partnerDetails, setPartnerDetails] = useState({});
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Mutual follow status for selected partner
  const [isMutual, setIsMutual] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [checkingMutual, setCheckingMutual] = useState(false);

  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Load initial conversation partners
  useEffect(() => {
    loadPartners();
  }, []);

  // Handle incoming target user from navigation state (e.g. from UserProfilePage)
  useEffect(() => {
    const targetId = location.state?.targetUserId;
    if (targetId && targetId !== user?.id) {
      handleSelectUser(targetId);
    }
  }, [location.state?.targetUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Polling for active conversation
  useEffect(() => {
    if (!selectedPartner) return;

    const poll = async () => {
      try {
        const { data } = await messageApi.getConversation(selectedPartner);
        setMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data)) {
            return data;
          }
          return prev;
        });
      } catch {}
    };

    pollTimerRef.current = setInterval(poll, 3500);
    return () => clearInterval(pollTimerRef.current);
  }, [selectedPartner]);

  // Debounced search for users
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await userApi.search(searchQuery.trim());
        // Filter out current user
        setSearchResults(data.filter(u => u.id !== user?.id));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  const loadPartners = async () => {
    try {
      const { data: ids } = await messageApi.getPartners();
      setPartners(ids);
      if (ids.length > 0) {
        try {
          const { data: users } = await userApi.getBatch(ids);
          const map = {};
          users.forEach(u => { map[u.id] = u; });
          setPartnerDetails(prev => ({ ...prev, ...map }));
        } catch {
          // Fallback to individual calls if batch fails
          for (const id of ids) {
            try {
              const { data } = await userApi.getById(id);
              setPartnerDetails(p => ({ ...p, [id]: data }));
            } catch {}
          }
        }
      }
    } catch {
      // If service is empty or error
    }
  };

  const checkMutualStatus = async (partnerId) => {
    setCheckingMutual(true);
    try {
      const [{ data: mutualData }, { data: followData }] = await Promise.all([
        followApi.areMutual(partnerId),
        followApi.isFollowing(partnerId),
      ]);
      setIsMutual(mutualData.mutual);
      setIsFollowing(followData.following);
    } catch {
      setIsMutual(false);
      setIsFollowing(false);
    } finally {
      setCheckingMutual(false);
    }
  };

  const handleSelectUser = async (partnerId) => {
    setSelectedPartner(partnerId);
    setLoading(true);

    // If partner details are not loaded yet, fetch them
    if (!partnerDetails[partnerId]) {
      try {
        const { data } = await userApi.getById(partnerId);
        setPartnerDetails(prev => ({ ...prev, [partnerId]: data }));
      } catch {}
    }

    // Add to partners list if not present
    setPartners(prev => (prev.includes(partnerId) ? prev : [partnerId, ...prev]));

    // Check mutual follow
    checkMutualStatus(partnerId);

    // Load messages
    try {
      const { data } = await messageApi.getConversation(partnerId);
      setMessages(data);
    } catch {
      toast.error('Could not load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!selectedPartner) return;
    try {
      const { data } = await followApi.toggle(selectedPartner);
      setIsFollowing(data.following);
      // Re-verify mutual status
      const { data: mData } = await followApi.areMutual(selectedPartner);
      setIsMutual(mData.mutual);
      toast.success(data.following ? 'Followed user' : 'Unfollowed user');
    } catch {
      toast.error('Could not update follow status');
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content || !selectedPartner || sending) return;

    // Check mutual status
    if (!isMutual) {
      toast.error('You can only message mutual followers');
      return;
    }

    setSending(true);
    try {
      const { data } = await messageApi.send(selectedPartner, content);
      setMessages(p => [...p, data]);
      setText('');
      // Ensure partner is in list
      setPartners(prev => (prev.includes(selectedPartner) ? prev : [selectedPartner, ...prev]));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const selectedUser = partnerDetails[selectedPartner];

  // Filter existing partners based on search query
  const filteredExistingPartners = partners.filter(id => {
    if (!searchQuery.trim()) return true;
    const u = partnerDetails[id];
    if (!u) return false;
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
  });

  // Filter global search results to users not already in filteredExistingPartners
  const newDiscoveredUsers = searchResults.filter(
    u => !partners.includes(u.id)
  );

  return (
    <div style={{ width: '100%', maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', margin: 0 }}>Messages</h1>
      </div>

      <div className="messages-layout" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Conversations / Search panel */}
        <div className="conversations-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Search bar */}
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="search-input-container">
              <Search size={15} className="search-icon" style={{ left: 12 }} />
              <input
                className="search-input"
                style={{
                  padding: '9px 32px 9px 34px',
                  fontSize: 13,
                  borderRadius: 10,
                  width: '100%',
                }}
                placeholder="Search people or chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 4,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* List section */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Searching indicator */}
            {searching && (
              <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                Searching users...
              </div>
            )}

            {/* Existing conversations */}
            {filteredExistingPartners.length > 0 && (
              <div>
                {searchQuery && (
                  <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Conversations
                  </div>
                )}
                {filteredExistingPartners.map(id => {
                  const u = partnerDetails[id];
                  const isSelected = selectedPartner === id;
                  return (
                    <div
                      key={id}
                      className={`conversation-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectUser(id)}
                    >
                      {u?.profilePicture ? (
                        <img src={u.profilePicture} className="avatar avatar-sm" alt={u.name} />
                      ) : (
                        <AvatarPlaceholder name={u?.name || `User ${id}`} size={36} />
                      )}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                          {u?.name || `User #${id}`}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          @{u?.username || `user${id}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* New discovered users from global search */}
            {searchQuery && newDiscoveredUsers.length > 0 && (
              <div>
                <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase' }}>
                  Users on ContentHub
                </div>
                {newDiscoveredUsers.map(u => {
                  const isSelected = selectedPartner === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`conversation-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setPartnerDetails(p => ({ ...p, [u.id]: u }));
                        handleSelectUser(u.id);
                        setSearchQuery('');
                      }}
                    >
                      {u.profilePicture ? (
                        <img src={u.profilePicture} className="avatar avatar-sm" alt={u.name} />
                      ) : (
                        <AvatarPlaceholder name={u.name} size={36} />
                      )}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          @{u.username}
                        </div>
                      </div>
                      <span
                        className="badge badge-purple"
                        style={{ fontSize: 10, padding: '2px 8px' }}
                      >
                        Chat
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No conversations state */}
            {!searchQuery && partners.length === 0 && (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No messages yet</div>
                <p style={{ margin: 0, fontSize: 12 }}>Search for a friend above to start chatting!</p>
              </div>
            )}

            {/* Empty search results */}
            {searchQuery && !searching && filteredExistingPartners.length === 0 && newDiscoveredUsers.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No users found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="chat-panel">
          {!selectedPartner ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--gradient-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
                <MessageSquare size={36} color="var(--accent-secondary)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Your Messages</h3>
              <p style={{ maxWidth: 320, margin: 0, fontSize: 13 }}>
                Search for friends, choose an existing conversation, or chat with mutual followers.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header" style={{ justifyContent: 'space-between' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => selectedUser?.username && navigate(`/user/${selectedUser.username}`)}
                >
                  {selectedUser?.profilePicture ? (
                    <img src={selectedUser.profilePicture} className="avatar avatar-sm" alt={selectedUser.name} />
                  ) : (
                    <AvatarPlaceholder name={selectedUser?.name || 'User'} size={36} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{selectedUser?.name || `User #${selectedPartner}`}</span>
                      {selectedUser?.username && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                          @{selectedUser.username}
                        </span>
                      )}
                    </div>
                    {/* Mutual Follow indicator */}
                    <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {checkingMutual ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Checking follow status...</span>
                      ) : isMutual ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                          Mutual Follower
                        </span>
                      ) : (
                        <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                          Not mutual follower
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Follow / Unfollow button if not mutual or for easy follow */}
                {!checkingMutual && (
                  <div>
                    <button
                      className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8 }}
                      onClick={handleToggleFollow}
                    >
                      {isFollowing ? (
                        <><UserCheck size={13} style={{ marginRight: 4 }} /> Following</>
                      ) : (
                        <><UserPlus size={13} style={{ marginRight: 4 }} /> Follow</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="chat-messages">
                {/* Non-mutual follower warning card */}
                {!checkingMutual && !isMutual && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 12,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#f59e0b' }}>Mutual follow required: </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        You both must follow each other to send and receive direct messages.
                      </span>
                    </div>
                    {!isFollowing && (
                      <button
                        className="btn btn-primary"
                        onClick={handleToggleFollow}
                        style={{ fontSize: 11, padding: '4px 10px', height: 'auto', borderRadius: 6 }}
                      >
                        Follow @{selectedUser?.username}
                      </button>
                    )}
                  </div>
                )}

                {loading ? (
                  <div className="flex justify-center" style={{ padding: 40 }}>
                    <span className="spinner" style={{ width: 28, height: 28 }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Start your conversation!
                    </div>
                    <p style={{ margin: 0, fontSize: 12 }}>
                      Send a message to say hello to {selectedUser?.name || 'this user'}.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                          marginBottom: 4,
                        }}
                      >
                        <div
                          className={`message-bubble ${isMe ? 'sent' : 'received'}`}
                          style={{
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                        >
                          {msg.content}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, padding: '0 4px' }}>
                          {msg.createdAt
                            ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })
                            : ''}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Row */}
              <form className="chat-input-row" onSubmit={handleSend}>
                <input
                  className="input"
                  style={{
                    flex: 1,
                    borderRadius: 'var(--radius-full)',
                    padding: '10px 18px',
                    fontSize: 14,
                  }}
                  placeholder={
                    isMutual
                      ? `Message ${selectedUser?.name || 'user'}...`
                      : 'Mutual follow required to send messages...'
                  }
                  value={text}
                  onChange={e => setText(e.target.value)}
                  disabled={!isMutual || sending}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  disabled={!isMutual || !text.trim() || sending}
                >
                  {sending ? (
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
