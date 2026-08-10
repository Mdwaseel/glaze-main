/** Admin panel endpoints. Every one of these requires a staff session. */

import { api } from './api'

/**
 * Build a FormData body when there is a File to send, and a plain object
 * otherwise.
 *
 * The alternative — always multipart — would work but turns every boolean
 * into the string "true" and every null into "null" on the Django side, which
 * DRF then has to coerce back. JSON keeps types intact, so multipart is used
 * only when a file actually forces it.
 */
export function toRequestBody(fields, fileFields = []) {
  const hasFile = fileFields.some((name) => fields[name] instanceof File)
  if (!hasFile) {
    const clean = { ...fields }
    // A File-typed field left untouched must not be sent at all, or DRF reads
    // it as "clear this image".
    fileFields.forEach((name) => {
      if (!(clean[name] instanceof File)) delete clean[name]
    })
    return clean
  }

  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (fileFields.includes(key) && !(value instanceof File)) return
    if (Array.isArray(value)) {
      // DRF's ListField reads repeated keys, not a JSON string.
      value.forEach((item) => form.append(key, item))
      return
    }
    form.append(key, typeof value === 'boolean' ? String(value) : value)
  })
  return form
}

/**
 * The same job as toRequestBody, for records that carry JSON columns.
 *
 * toRequestBody appends an array as REPEATED KEYS, which is right for a
 * ListField of tags and wrong for `stats` — a list of objects that has to
 * arrive as one JSON value. Multipart has no types at all, so anything
 * structured has to be stringified and parsed back on the other side
 * (catalogue/serializers.py, JSONFieldsFromFormMixin).
 *
 * When nothing is being uploaded this returns a plain object and the whole
 * problem does not arise, which is the ordinary case: most catalogue edits
 * are text.
 */
export function toCatalogueBody(fields, fileFields = [], jsonFields = []) {
  const hasFile = fileFields.some((name) => fields[name] instanceof File)

  if (!hasFile) {
    const clean = { ...fields }
    // A file field left untouched holds the saved URL, not a File. Sending it
    // back would have DRF read a string where it expects an upload.
    fileFields.forEach((name) => delete clean[name])
    return clean
  }

  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (fileFields.includes(key)) {
      if (value instanceof File) form.append(key, value)
      return
    }
    form.append(key, jsonFields.includes(key) ? JSON.stringify(value) : String(value))
  })
  return form
}

export const authApi = {
  captcha: () => api.get('/auth/captcha/', { auth: false }),
  adminLogin: (payload) => api.post('/auth/admin/login/', payload, { auth: false }),
  logout: () => api.post('/auth/logout/', undefined, { auth: false }),
  me: () => api.get('/auth/me/'),
  changePassword: (payload) => api.post('/auth/password/change/', payload),
}

export const adminApi = {
  // ── Analytics ──────────────────────────────────────────────────────
  dashboard: (days = 30, signal) => api.get('/admin/analytics/', { params: { days }, signal }),
  pagesReport: (days = 30, signal) => api.get('/admin/analytics/pages/', { params: { days }, signal }),
  securityReport: (signal) => api.get('/admin/analytics/security/', { signal }),

  // ── Posts ──────────────────────────────────────────────────────────
  listPosts: (params, signal) => api.get('/admin/posts/', { params, signal }),
  getPost: (id, signal) => api.get(`/admin/posts/${id}/`, { signal }),
  createPost: (body) => api.post('/admin/posts/', body),
  updatePost: (id, body) => api.patch(`/admin/posts/${id}/`, body),
  deletePost: (id) => api.delete(`/admin/posts/${id}/`),
  publishPost: (id) => api.post(`/admin/posts/${id}/publish/`),
  unpublishPost: (id) => api.post(`/admin/posts/${id}/unpublish/`),
  duplicatePost: (id) => api.post(`/admin/posts/${id}/duplicate/`),
  checkSlug: (slug, exclude) =>
    api.get('/blog/slug-check/', { auth: false, params: { slug, exclude } }),

  // ── Taxonomy ───────────────────────────────────────────────────────
  listCategories: (signal) => api.get('/admin/categories/', { signal }),
  createCategory: (body) => api.post('/admin/categories/', body),
  updateCategory: (id, body) => api.patch(`/admin/categories/${id}/`, body),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}/`),

  listAuthors: (signal) => api.get('/admin/authors/', { signal }),
  createAuthor: (body) => api.post('/admin/authors/', body),
  updateAuthor: (id, body) => api.patch(`/admin/authors/${id}/`, body),
  deleteAuthor: (id) => api.delete(`/admin/authors/${id}/`),

  listTags: (signal) => api.get('/admin/tags/', { signal }),

  // ── Comments ───────────────────────────────────────────────────────
  listComments: (params, signal) => api.get('/admin/comments/', { params, signal }),
  moderateComment: (id, status) => api.patch(`/admin/comments/${id}/`, { status }),
  deleteComment: (id) => api.delete(`/admin/comments/${id}/`),

  // ── Enquiries ──────────────────────────────────────────────────────
  listEnquiries: (params, signal) => api.get('/admin/enquiries/', { params, signal }),
  updateEnquiry: (id, body) => api.patch(`/admin/enquiries/${id}/`, body),
  deleteEnquiry: (id) => api.delete(`/admin/enquiries/${id}/`),

  // ── Catalogue ──────────────────────────────────────────────────────
  // Systems are addressed by SLUG, not id: it is what the editor's URL
  // carries and what every reference to a system on the public site uses.
  // Variants are addressed by id, because their key is only unique within
  // a system and renaming one must not change what it addresses.
  listSystems: (signal) => api.get('/admin/systems/', { signal }),
  getSystem: (slug, signal) => api.get(`/admin/systems/${slug}/`, { signal }),
  createSystem: (body) => api.post('/admin/systems/', body),
  updateSystem: (slug, body) => api.patch(`/admin/systems/${slug}/`, body),
  deleteSystem: (slug) => api.delete(`/admin/systems/${slug}/`),

  listVariants: (slug, signal) => api.get(`/admin/systems/${slug}/variants/`, { signal }),
  createVariant: (slug, body) => api.post(`/admin/systems/${slug}/variants/`, body),
  updateVariant: (id, body) => api.patch(`/admin/variants/${id}/`, body),
  deleteVariant: (id) => api.delete(`/admin/variants/${id}/`),
  reorderVariants: (slug, keys) =>
    api.post(`/admin/systems/${slug}/variants/reorder/`, { keys }),

  // ── Gallery ────────────────────────────────────────────────────────
  // Unpaginated like the catalogue's list: the Studio's grid is a
  // move-up/move-down surface, and a page control over it means an item can
  // only be moved within its own page.
  listGalleryItems: (signal) => api.get('/admin/gallery/items/', { signal }),
  getGalleryItem: (id, signal) => api.get(`/admin/gallery/items/${id}/`, { signal }),
  createGalleryItem: (body) => api.post('/admin/gallery/items/', body),
  updateGalleryItem: (id, body) => api.patch(`/admin/gallery/items/${id}/`, body),
  deleteGalleryItem: (id) => api.delete(`/admin/gallery/items/${id}/`),
  /* One call writes the whole sequence. Unlike the systems list — which only
     ever swaps a pair — a gallery is reordered by dragging one tile across
     several positions, which renumbers everything in between. */
  reorderGalleryItems: (ids) => api.post('/admin/gallery/items/reorder/', { ids }),

  listGalleryCategories: (signal) => api.get('/admin/gallery/categories/', { signal }),
  createGalleryCategory: (body) => api.post('/admin/gallery/categories/', body),
  updateGalleryCategory: (id, body) => api.patch(`/admin/gallery/categories/${id}/`, body),
  deleteGalleryCategory: (id) => api.delete(`/admin/gallery/categories/${id}/`),

  // ── Settings ───────────────────────────────────────────────────────
  getSiteSettings: (signal) => api.get('/admin/site-settings/', { signal }),
  updateSiteSettings: (body) => api.patch('/admin/site-settings/', body),
  getContactSettings: (signal) => api.get('/admin/contact-settings/', { signal }),
  updateContactSettings: (body) => api.patch('/admin/contact-settings/', body),
  sendTestAutoReply: (email) =>
    api.post('/admin/contact-settings/test/', { kind: 'auto_reply', email }),
  /**
   * The staff notification for one enquiry type.
   *
   * No `email`: it goes to the addresses that type is really routed to. That
   * is the point — it is the routing being tested, not the transport, and a
   * test that mailed only the person running it could not catch a typo in a
   * colleague's address.
   */
  sendTestNotification: (category) =>
    api.post('/admin/contact-settings/test/', { kind: 'notification', category }),
}
