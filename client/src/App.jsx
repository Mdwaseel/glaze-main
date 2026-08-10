import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useLenis, useScrollRestoration } from '@/hooks'
import { usePageTracking } from '@/hooks/usePageTracking'
import { ROUTES } from '@/constants/routes'
import { RootLayout } from '@/layouts'
import Home from '@/pages/Home'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import Systems from '@/pages/Systems'
import SystemRoute from '@/pages/Products'
import { BlogIndex, BlogPost } from '@/pages/Blog'
import ThankYou from '@/pages/ThankYou'
import Faq from '@/pages/Faq'
import Gallery from '@/pages/Gallery'
import LegalPage from '@/pages/Legal'
import NotFound from '@/pages/NotFound'
import { Tracking } from '@/components/common/SEO'

/**
 * The admin panel is lazy-loaded, and this is not a micro-optimisation.
 *
 * Statically imported it added ~250 KB to the entry bundle — every visitor
 * reading an article downloaded the whole CMS, its editor, its charts and its
 * settings forms, to render a page that uses none of them. Behind lazy() it
 * becomes a separate chunk fetched only when someone actually navigates to
 * /admin, which is a handful of people rather than all of them.
 *
 * The public pages stay statically imported on purpose. They are the reason
 * anyone is here, and splitting them would trade a smaller bundle for a
 * loading state on the content that matters.
 */
const AdminLayout = lazy(() => import('@/pages/Admin/AdminLayout'))
const AdminLogin = lazy(() => import('@/pages/Admin/AdminLogin'))
const Dashboard = lazy(() => import('@/pages/Admin/Dashboard'))
const PostsList = lazy(() => import('@/pages/Admin/PostsList'))
const PostEditor = lazy(() => import('@/pages/Admin/PostEditor'))
const Taxonomy = lazy(() => import('@/pages/Admin/Taxonomy'))
// Prefixed: `Systems` is already the public collection page imported above.
const AdminSystems = lazy(() => import('@/pages/Admin/Systems'))
const AdminSystemEditor = lazy(() => import('@/pages/Admin/SystemEditor'))
// Prefixed for the same reason AdminSystems is: `Gallery` is already the
// public page imported above.
const AdminGallery = lazy(() => import('@/pages/Admin/Gallery'))
const Comments = lazy(() => import('@/pages/Admin/Comments'))
const Enquiries = lazy(() => import('@/pages/Admin/Enquiries'))
const ContactSettings = lazy(() => import('@/pages/Admin/ContactSettings'))
const SiteSettings = lazy(() => import('@/pages/Admin/SiteSettings'))
const Analytics = lazy(() => import('@/pages/Admin/Analytics'))
const SecurityLog = lazy(() =>
  // Named export, so it needs mapping to a default for lazy().
  import('@/pages/Admin/Analytics').then((m) => ({ default: m.SecurityLog })),
)

/**
 * App shell.
 *
 * Lenis is initialised once here, exactly as the original pages did it in
 * the single base <script> at the bottom of <body> — one instance for the
 * whole document, shared through window.__glazeLenis.
 *
 * RootLayout carries the shared skip link, Navbar and Footer.
 *
 * Two route trees, and the split is deliberate:
 *
 *   public  wrapped in RootLayout, so every page keeps the site's Navbar,
 *           Footer and skip link exactly as the static pages had them.
 *
 *   /admin  NOT wrapped in RootLayout. The panel is a separate application
 *           with its own navigation rail; the marketing navbar and footer
 *           around a settings form would be wrong, and the footer's contact
 *           links have no place on a data table.
 *
 * Lenis is off under /admin — momentum scrolling overshoots the row you were
 * aiming at in a dense table. Page tracking is mounted globally but skips
 * /admin itself (services/analytics.js), so staff working in the panel never
 * pollute the traffic figures those same staff are reading.
 */
export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  useLenis(!isAdmin)

  /* A link has to land on the page it names. Without this the router
     keeps the outgoing page's scroll offset, so opening a system from
     partway down another one dropped the visitor into the middle of it —
     the variants section, most often. Mounted here rather than in
     RootLayout so the admin panel gets it too: a long enquiries table
     scrolled halfway had exactly the same effect on the settings form
     opened from it. See hooks/useScrollRestoration.js. */
  useScrollRestoration()

  usePageTracking()

  return (
    <>
      {/* Meta Pixel / GA4 / GTM and the verification tags, all from Site
          Settings and all no-ops until someone fills a field in. Mounted
          outside <Routes> so one install survives navigation — re-injecting
          the pixel per route would count one visitor many times. It skips
          /admin itself. */}
      <Tracking />
      <Routes>
      <Route element={<RootLayout />}>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.ABOUT} element={<About />} />
        <Route path={ROUTES.CONTACT} element={<Contact />} />
        {/* The collection index — the same carousel Home renders. */}
        <Route path={ROUTES.SYSTEMS} element={<Systems />} />
        {/* One route for all seven system pages — see pages/Products. */}
        <Route path={ROUTES.SYSTEM} element={<SystemRoute />} />
        <Route path={ROUTES.BLOG} element={<BlogIndex />} />
        <Route path={ROUTES.BLOG_POST} element={<BlogPost />} />

        {/* Both hang off "About" in the nav — see constants/navigation.js.
            /faq is the hub for the question sets that also appear in context
            on /systems, /contact and each system page; /gallery is the one
            public page whose entire content comes from the database. */}
        <Route path={ROUTES.FAQ} element={<Faq />} />
        <Route path={ROUTES.GALLERY} element={<Gallery />} />

        {/* Where both enquiry forms land. Inside RootLayout like every other
            public page — a confirmation with no navigation is the same dead
            end a bare 404 is. */}
        <Route path={ROUTES.THANK_YOU} element={<ThankYou />} />

        {/* The policies. One component, three routes, three documents in
            data/legal.js — the same template-plus-data shape SystemPage
            uses, and for the same reason: they differ only in their words.
            Deliberately indexable; see the note in pages/Legal. */}
        <Route path={ROUTES.PRIVACY} element={<LegalPage doc="privacy" />} />
        <Route path={ROUTES.TERMS} element={<LegalPage doc="terms" />} />
        <Route path={ROUTES.COOKIES} element={<LegalPage doc="cookies" />} />

        {/* ⚠ THE WHITE SCREEN. Without this route React Router matched
            nothing on an unrecognised URL and rendered an EMPTY TREE — not an
            error, not a fallback, a blank white document. Verified headlessly:
            `/some-old-link` produced a 0-character #root and the router logged
            "No routes matched location", while every declared route rendered
            24k-82k of markup. Nothing was throwing; there was simply nowhere
            for an unmatched URL to land.

            It bit hardest on the legacy filenames. This site was migrated from
            `about.html` / `contact.html` / `products/sliding.html`, so every
            old bookmark, printed link and search result pointing at a `.html`
            path got the blank page instead of the page that replaced it.
            NotFound redirects those via LEGACY_PATHS and 404s the rest.

            It sits INSIDE RootLayout on purpose — a 404 without the navbar and
            footer is a dead end. */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Login sits OUTSIDE AdminLayout: the layout is the route guard, and
          nesting the login inside it would have it redirect to itself.

          Each lazy route carries its own <Suspense>. One wrapper around the
          whole admin tree would work too, but this way the fallback replaces
          only the panel being loaded — moving between admin screens keeps the
          navigation rail on screen instead of blanking the page. */}
      <Route
        path={ROUTES.ADMIN_LOGIN}
        element={<Suspense fallback={<AdminFallback />}><AdminLogin /></Suspense>}
      />

      <Route
        path={ROUTES.ADMIN}
        element={<Suspense fallback={<AdminFallback />}><AdminLayout /></Suspense>}
      >
        <Route index element={<Suspense fallback={<AdminFallback />}><Dashboard /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<AdminFallback />}><Analytics /></Suspense>} />
        <Route path="posts" element={<Suspense fallback={<AdminFallback />}><PostsList /></Suspense>} />
        {/* `posts/new` is declared before `posts/:id` for readability; React
            Router 7 ranks static segments above dynamic ones regardless, so
            "new" is never captured as an id. */}
        <Route path="posts/new" element={<Suspense fallback={<AdminFallback />}><PostEditor /></Suspense>} />
        <Route path="posts/:id" element={<Suspense fallback={<AdminFallback />}><PostEditor /></Suspense>} />
        <Route path="taxonomy" element={<Suspense fallback={<AdminFallback />}><Taxonomy /></Suspense>} />

        {/* Catalogue. `systems/new` before `systems/:slug` for readability;
            React Router ranks static segments above dynamic ones regardless,
            so "new" is never captured as a slug. */}
        <Route path="systems" element={<Suspense fallback={<AdminFallback />}><AdminSystems /></Suspense>} />
        <Route path="systems/new" element={<Suspense fallback={<AdminFallback />}><AdminSystemEditor /></Suspense>} />
        <Route path="systems/:slug" element={<Suspense fallback={<AdminFallback />}><AdminSystemEditor /></Suspense>} />
        {/* One screen, two tabs — items and the categories they are filed
            under. See pages/Admin/Gallery. */}
        <Route path="gallery" element={<Suspense fallback={<AdminFallback />}><AdminGallery /></Suspense>} />

        <Route path="comments" element={<Suspense fallback={<AdminFallback />}><Comments /></Suspense>} />
        <Route path="enquiries" element={<Suspense fallback={<AdminFallback />}><Enquiries /></Suspense>} />
        <Route path="settings/contact" element={<Suspense fallback={<AdminFallback />}><ContactSettings /></Suspense>} />
        <Route path="settings/site" element={<Suspense fallback={<AdminFallback />}><SiteSettings /></Suspense>} />
        <Route path="security" element={<Suspense fallback={<AdminFallback />}><SecurityLog /></Suspense>} />

        {/* The admin tree needs its own catch-all. A mistyped `/admin/postss`
            would otherwise fall through to the public 404 and wrap the
            marketing navbar and footer around a staff dead end. Staff get put
            back on the dashboard instead. */}
        <Route path="*" element={<Navigate to={ROUTES.ADMIN} replace />} />
      </Route>
      </Routes>
    </>
  )
}

/**
 * Placeholder shown while an admin chunk downloads.
 *
 * Deliberately a bare tinted panel rather than a spinner: the chunk lands in
 * well under a second on any normal connection, and a spinner that flashes
 * for 200ms reads as jank rather than progress.
 */
function AdminFallback() {
  return (
    <div
      style={{ minHeight: '100vh', background: '#F5F5F3' }}
      aria-busy="true"
      aria-label="Loading"
    />
  )
}
