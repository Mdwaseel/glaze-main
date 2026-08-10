import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { adminApi } from '@/services/admin'
import { ToastProvider } from '@/components/admin/Toast'
import Icon from '@/components/admin/Icon'
import '@/styles/admin.css'

/**
 * The panel shell: route guard, navigation rail, toast host.
 *
 * The guard is a convenience, not the security boundary. It stops the UI
 * rendering panels that would 401 anyway; the actual enforcement is
 * IsStaff on every admin endpoint. Anyone can route themselves to /admin —
 * they just get nothing back from the API.
 *
 * `status === 'checking'` renders a neutral frame rather than the login
 * screen. Redirecting during the check would bounce an already-signed-in
 * admin to /admin/login on every page refresh, before /auth/me/ had a chance
 * to answer.
 */

const NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', end: true, icon: 'dashboard', label: 'Dashboard' },
      { to: '/admin/analytics', icon: 'analytics', label: 'Analytics' },
    ],
  },
  {
    // Above the blog centre on purpose: the products are what the site is
    // for, and the journal is what supports them.
    label: 'Catalogue',
    items: [
      { to: '/admin/systems', icon: 'tags', label: 'Systems & variants' },
      { to: '/admin/systems/new', icon: 'plus', label: 'New system' },
      // In the Catalogue group rather than a group of its own: a gallery of
      // finished work is the products photographed, and one nav entry does
      // not earn a heading.
      { to: '/admin/gallery', icon: 'eye', label: 'Gallery' },
    ],
  },
  {
    label: 'Blog centre',
    items: [
      { to: '/admin/posts', icon: 'posts', label: 'Articles' },
      { to: '/admin/posts/new', icon: 'editor', label: 'New article' },
      { to: '/admin/taxonomy', icon: 'tags', label: 'Categories & authors' },
      { to: '/admin/comments', icon: 'comments', label: 'Comments', badge: 'comments' },
    ],
  },
  {
    label: 'Enquiries',
    items: [
      { to: '/admin/enquiries', icon: 'inbox', label: 'Inbox', badge: 'enquiries' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/settings/contact', icon: 'mail', label: 'Contact settings' },
      { to: '/admin/settings/site', icon: 'settings', label: 'Site settings' },
      { to: '/admin/security', icon: 'shield', label: 'Security log' },
    ],
  },
]

export default function AdminLayout() {
  const { status, user, logout } = useAuth()
  const location = useLocation()
  const [counts, setCounts] = useState({ comments: 0, enquiries: 0 })

  // Badge counts come from the dashboard endpoint, which the Dashboard page
  // also calls. Two cheap reads beats threading state between siblings.
  useEffect(() => {
    if (status !== 'authed') return undefined
    const controller = new AbortController()

    adminApi
      .dashboard(30, controller.signal)
      .then((data) =>
        setCounts({
          comments: data.content.comments_pending,
          enquiries: data.content.enquiries_new,
        }),
      )
      .catch(() => {})

    return () => controller.abort()
  }, [status, location.pathname])

  if (status === 'checking') {
    return (
      <div className="ad">
        <div className="ad__main" aria-busy="true">
          <span className="ad-skeleton ad-skeleton--tile" />
        </div>
      </div>
    )
  }

  if (status !== 'authed') {
    // `from` lets the login screen return the user where they were headed.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return (
    <ToastProvider>
      <div className="ad">
        <div className="ad__layout">
          <aside className="ad__rail">
            <div className="ad__brand">
              <p className="ad__brand-mark">Glaze</p>
              <p className="ad__brand-sub">Studio</p>
            </div>

            <nav className="ad__nav" aria-label="Admin sections">
              {NAV.map((group) => (
                <div key={group.label} className="ad__nav-group">
                  <p className="ad__nav-label">{group.label}</p>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `ad__nav-link${isActive ? ' is-active' : ''}`
                      }
                    >
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                      {item.badge && counts[item.badge] > 0 && (
                        <span className="ad__nav-badge">{counts[item.badge]}</span>
                      )}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>

            <div className="ad__rail-foot">
              <p className="ad__rail-user">{user?.full_name || user?.email}</p>
              <button type="button" className="ad__signout" onClick={logout}>
                Sign out
              </button>
            </div>
          </aside>

          <main className="ad__main">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}

/** Shared page header. Used by every panel so titles and actions line up. */
export function PageHead({ title, subtitle, children }) {
  return (
    <header className="ad__head">
      <div>
        <h1 className="ad__title">{title}</h1>
        {subtitle && <p className="ad__subtitle">{subtitle}</p>}
      </div>
      {children && <div className="ad__actions">{children}</div>}
    </header>
  )
}
