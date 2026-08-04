/** Shared formatters for the blog and admin surfaces. */

/** "12 March 2026". Long month because these sit beside editorial type. */
export function formatDate(value, options) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  })
}

/** "12 Mar 2026, 14:30" — for dense admin tables where the row height matters. */
export function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }`
}

/** "3 days ago". Falls back to an absolute date past a month, where
 *  "47 days ago" stops being easier to read than the date itself. */
export function formatRelative(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(value)
}

/** 12400 -> "12.4k". Keeps dashboard stat tiles from reflowing on a spike. */
export function compactNumber(value) {
  const n = Number(value) || 0
  if (Math.abs(n) < 1000) return String(n)
  if (Math.abs(n) < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

/** Milliseconds -> "2m 14s" / "48s". Used for average time on page. */
export function formatDuration(ms) {
  const total = Math.round((Number(ms) || 0) / 1000)
  if (total <= 0) return '—'
  if (total < 60) return `${total}s`
  return `${Math.floor(total / 60)}m ${total % 60}s`
}

/**
 * Small counts in words, for headings.
 *
 * "11 formats." in Playfair beside "Twelve series." two sections down reads
 * as a different writer. Both the systems carousel ("Seven systems.") and the
 * variants rail ("Eleven formats.") count a list that is now editable, so
 * neither can hard-code its own number any more — and the number itself is
 * what changes when someone adds a system in the panel.
 *
 * Above twelve it returns the digits: at that point the word is longer than
 * the line has room for, and a heading is not the place to be pedantic.
 */
const COUNT_WORD_LIST = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six',
  'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
]

export function countWord(n) {
  return COUNT_WORD_LIST[n] || String(n)
}

/** First letters of the first two words, for avatar fallbacks. */
export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

/**
 * Title -> URL slug, matching Django's slugify closely enough for the live
 * preview in the editor. The server remains the authority and will replace
 * this on save if it disagrees.
 */
export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 200)
}
