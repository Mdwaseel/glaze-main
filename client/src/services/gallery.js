/** The public gallery. Read-only, no auth. */

import { api } from './api'

/** `auth: false` — anonymous, so a 401 must not trigger a token refresh. */
const PUBLIC = { auth: false }

export const galleryApi = {
  /**
   * Published categories and items in one response.
   *
   * ⚠ IT IS CAPPED SERVER-SIDE and says so. Unlike the catalogue — seven
   * systems, a fixed set — this table grows every time somebody visits a
   * finished project with a camera, so the response carries `total` and
   * `limit` alongside the items. The page prints "showing 120 of 340" rather
   * than quietly presenting a truncated grid as the whole gallery.
   */
  get: (signal) => api.get('/gallery/', { ...PUBLIC, signal }),
}

export default galleryApi
