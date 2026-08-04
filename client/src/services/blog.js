/** Public blog endpoints. Read-only, no auth. */

import { api } from './api'

/** `auth: false` — these are anonymous, so a 401 must not trigger a refresh. */
const PUBLIC = { auth: false }

export const blogApi = {
  listPosts: (params, signal) => api.get('/blog/posts/', { ...PUBLIC, params, signal }),
  getPost: (slug, signal) => api.get(`/blog/posts/${slug}/`, { ...PUBLIC, signal }),
  taxonomy: (signal) => api.get('/blog/taxonomy/', { ...PUBLIC, signal }),
  listComments: (slug, signal) => api.get(`/blog/posts/${slug}/comments/`, { ...PUBLIC, signal }),
  addComment: (slug, body) => api.post(`/blog/posts/${slug}/comments/`, body, PUBLIC),
}

export const siteApi = {
  getSettings: (signal) => api.get('/site-settings/', { ...PUBLIC, signal }),
  submitEnquiry: (body) => api.post('/enquiries/', body, PUBLIC),
}
