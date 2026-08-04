import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { SiteSettingsProvider } from '@/context/SiteSettingsContext'
import { CatalogueProvider } from '@/context/CatalogueContext'
import ErrorBoundary from '@/components/common/ErrorBoundary/ErrorBoundary'
import './styles/index.css'
import App from './App.jsx'

/**
 * Provider order matters here.
 *
 * SiteSettingsProvider is outermost because the public pages need contact
 * details on first paint and its fetch is anonymous — it must not wait on
 * anything auth-related.
 *
 * CatalogueProvider sits beside it for the same reason: the systems and their
 * variants are what the carousel, every product page and both enquiry forms
 * render, its fetch is anonymous, and it starts from the shipped catalogue so
 * nothing waits on the request.
 *
 * AuthProvider sits inside them and fires one /auth/me/ on boot to establish
 * whether there is a staff session. That request is cheap, 401s harmlessly
 * for the 99% of visitors who are not admins, and is what lets a signed-in
 * admin refresh /admin without being bounced to the login screen.
 */
/*
 * ErrorBoundary is OUTSIDE BrowserRouter, deliberately.
 *
 * Inside it, a throw from the router's own context — a bad basename, a
 * malformed URL — would happen above the boundary and go uncaught, which is
 * the white screen again. Outside, it catches everything below it.
 *
 * The cost is that its fallback cannot use <Link>: there is no router in scope
 * at that point, so it uses a plain <a href="/">. That is correct anyway — the
 * tree has already failed and a full document load is what you want.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <SiteSettingsProvider>
          <CatalogueProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </CatalogueProvider>
        </SiteSettingsProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
