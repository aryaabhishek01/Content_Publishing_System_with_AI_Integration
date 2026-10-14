import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth ──
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ── Users ──
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  getByUsername: (username) => api.get(`/users/${username}`),
  getById: (id) => api.get(`/users/id/${id}`),
  getBatch: (ids) => api.post('/users/batch', ids),
  search: (keyword) => api.get('/users/search', { params: { keyword } }),
  getAllUsers: () => api.get('/users/all'),
  uploadProfilePic: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/users/me/profile-picture', fd);
  },
};

// ── Posts ──
export const postApi = {
  getFeed: (params) => api.get('/posts/feed', { params }),
  create: (data) => api.post('/posts', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPost: (id) => api.get(`/posts/${id}`),
  getUserPosts: (userId) => api.get(`/posts/user/${userId}`),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  addComment: (id, content) => api.post(`/posts/${id}/comments`, { content }),
  getComments: (id) => api.get(`/posts/${id}/comments`),
  getCategories: () => api.get('/posts/categories'),
  searchCategories: (keyword) => api.get('/posts/categories/search', { params: { keyword } }),
};

// ── Follows ──
export const followApi = {
  toggle: (userId) => api.post(`/follows/${userId}`),
  unfollow: (userId) => api.delete(`/follows/${userId}`),
  removeFollower: (followerId) => api.delete(`/follows/followers/${followerId}`),
  getFollowing: (userId) => api.get(`/follows/${userId}/following`),
  getFollowers: (userId) => api.get(`/follows/${userId}/followers`),
  getCounts: (userId) => api.get(`/follows/${userId}/counts`),
  isFollowing: (userId) => api.get(`/follows/is-following/${userId}`),
  areMutual: (userId) => api.get(`/follows/mutual/${userId}`),
};

// ── Messages ──
export const messageApi = {
  send: (receiverId, content) => api.post(`/messages/${receiverId}`, { content }),
  getConversation: (userId) => api.get(`/messages/conversation/${userId}`),
  getPartners: () => api.get('/messages/conversations'),
  getUnreadCount: () => api.get('/messages/unread-count'),
};

// ── Notifications ──
export const notificationApi = {
  getAll: () => api.get('/notifications'),
  getUnread: () => api.get('/notifications/unread'),
  getCount: () => api.get('/notifications/count'),
  markRead: () => api.post('/notifications/mark-read'),
};

// ── Feedback ──
export const feedbackApi = {
  submit: (data) => api.post('/feedback', data),
  getMy: () => api.get('/feedback/my'),
  getAll: () => api.get('/feedback/all'),
  reply: (id, reply) => api.post(`/feedback/${id}/reply`, { reply }),
  getReplies: (id) => api.get(`/feedback/${id}/replies`),
};

// ── AI Agents ──
export const aiApi = {
  generateDescription: (data) => api.post('/ai/description/generate', data),
  generateFeedbackMessage: (subject) => api.post('/ai/feedback/generate', { subject }),
  generateAdminReply: (subject, userMessage) => api.post('/ai/feedback/reply', { subject, userMessage }),
  getRecommendations: (userId) => api.get(`/ai/recommendations/${userId}`),
  recordBehavior: (data) => api.post('/ai/behavior/record', data),
  spellCheck: (text) => api.post('/ai/spellcheck', { text }),
};
