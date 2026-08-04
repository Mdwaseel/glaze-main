/** The public product catalogue. Read-only, no auth. */

import { api } from './api'

/** `auth: false` — anonymous, so a 401 must not trigger a token refresh. */
const PUBLIC = { auth: false }

export const catalogueApi = {
  /**
   * Every published system with its variants, in one response.
   *
   * One request rather than a list plus a detail per system: the nav's footer
   * column, the carousel, a system page's cross-links and both enquiry forms
   * all want the whole set, and seven systems is a few tens of kilobytes —
   * less than one poster on the page.
   */
  get: (signal) => api.get('/catalogue/', { ...PUBLIC, signal }),
}
