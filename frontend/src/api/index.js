import api from './client';

// ── Auth ───────────────────────────────────────────────────
export const authAPI = {
  register: (data)        => api.post('/auth/register', data),
  login:    (data)        => api.post('/auth/login', data),
  refresh:  (refreshToken)=> api.post('/auth/refresh', { refreshToken }),
  logout:   (refreshToken)=> api.post('/auth/logout', { refreshToken }),
};

// ── Users ──────────────────────────────────────────────────
export const usersAPI = {
  getProfile:   (username)       => api.get(`/users/${username}`),
  updateProfile:(data)           => api.put('/users/me', data),
  getMe:        ()               => api.get('/users/me'),
  search:       (q, params)      => api.get('/users/search', { params: { q, ...params } }),
  follow:       (username)       => api.post(`/users/${username}/follow`),
  unfollow:     (username)       => api.delete(`/users/${username}/follow`),
  getFollowers: (username, p)    => api.get(`/users/${username}/followers`, { params: p }),
  getFollowing: (username, p)    => api.get(`/users/${username}/following`, { params: p }),
  blockUser:    (username)       => api.post(`/users/${username}/block`),
  getHighlights:(username)       => api.get(`/users/${username}/highlights`),
};

// ── Posts ──────────────────────────────────────────────────
export const postsAPI = {
  getFeed:      (params)    => api.get('/posts/feed', { params }),
  getExplore:   (params)    => api.get('/posts/explore', { params }),
  getPost:      (id)        => api.get(`/posts/${id}`),
  createPost:   (formData)  => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deletePost:   (id)        => api.delete(`/posts/${id}`),
  likePost:     (id)        => api.post(`/posts/${id}/like`),
  unlikePost:   (id)        => api.delete(`/posts/${id}/like`),
  savePost:     (id)        => api.post(`/posts/${id}/save`),
  unsavePost:   (id)        => api.delete(`/posts/${id}/save`),
  getByHashtag: (tag, p)    => api.get(`/posts/hashtag/${tag}`, { params: p }),
  getUserPosts: (username, p) => api.get(`/users/${username}/posts`, { params: p }),
};

// ── Comments ───────────────────────────────────────────────
export const commentsAPI = {
  getComments:   (postId, p)   => api.get(`/posts/${postId}/comments`, { params: p }),
  addComment:    (postId, data) => api.post(`/posts/${postId}/comments`, data),
  deleteComment: (id)           => api.delete(`/comments/${id}`),
  likeComment:   (id)           => api.post(`/comments/${id}/like`),
  unlikeComment: (id)           => api.delete(`/comments/${id}/like`),
  getReplies:    (id)           => api.get(`/comments/${id}/replies`),
};

// ── Stories ────────────────────────────────────────────────
export const storiesAPI = {
  getFeed:      ()           => api.get('/stories/feed'),
  createStory:  (formData)   => api.post('/stories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getStory:     (id)         => api.get(`/stories/${id}`),
  viewStory:    (id)         => api.post(`/stories/${id}/view`),
  getViewers:   (id)         => api.get(`/stories/${id}/viewers`),
  reactToStory: (id, emoji)  => api.post(`/stories/${id}/react`, { emoji }),
  deleteStory:  (id)         => api.delete(`/stories/${id}`),
};

// ── Messages ───────────────────────────────────────────────
export const messagesAPI = {
  getConversations:  ()           => api.get('/conversations'),
  createConversation:(data)       => api.post('/conversations', data),
  getMessages:       (id, params) => api.get(`/conversations/${id}/messages`, { params }),
  sendMessage:       (id, data)   => api.post(`/conversations/${id}/messages`, data, {
    headers: { 'Content-Type': 'application/json' },
  }),
  sendMediaMessage:  (id, fd)     => api.post(`/conversations/${id}/messages/media`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteMessage:     (id)         => api.delete(`/conversations/messages/${id}`),
};

// ── Notifications ──────────────────────────────────────────
export const notificationsAPI = {
  getAll:      (params) => api.get('/notifications', { params }),
  markAllRead: ()       => api.post('/notifications/read-all'),
  markRead:    (id)     => api.post(`/notifications/${id}/read`),
};

// ── Search ─────────────────────────────────────────────────
export const searchAPI = {
  search: (q, type) => api.get('/search', { params: { q, type } }),
};