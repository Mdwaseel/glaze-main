import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { siteApi } from '@/services/blog'
import { FOOTER_REACH_LINKS } from '@/constants/navigation'

/**
 * Site-wide settings, fetched once and shared.
 *
 * The migrated pages hard-code the phone number, email and address in three
 * places (navigation.js, the contact sections, the footer). This provider is
 * what makes the admin panel's Site Settings screen mean anything: change the
 * number there and every consumer follows without a redeploy.
 *
 * FALLBACK IS THE HARD-CODED SET, deliberately. If the API is unreachable —
 * a static deploy with no backend, a cold Django, a network blip — the site
 * shows the values it shipped with rather than blank space where a phone
 * number should be. A marketing site that renders an empty contact block is
 * worse than one showing a slightly stale number.
 */

const FALLBACK = {
  site_name: 'Glaze Window Systems',
  tagline: 'Designed to Disappear.',
  contact_email: FOOTER_REACH_LINKS[0].label,
  contact_phone: FOOTER_REACH_LINKS[1].label,
  contact_phone_secondary: '',
  address: 'Jubilee Hills, Hyderabad',
  map_url: FOOTER_REACH_LINKS[2].href,
  business_hours: 'Mon – Sat · 10:00 – 19:00',
  whatsapp_enabled: false,
  whatsapp_number: '',
  whatsapp_label: 'Enquire on WhatsApp',
  whatsapp_link: '',
  instagram_url: 'https://www.instagram.com/glaze_window_systems/',
  facebook_url: 'https://www.facebook.com/Glazewindowsystems',
  linkedin_url: 'https://in.linkedin.com/company/glaze-window-systems',
  youtube_url: 'https://www.youtube.com/@GlazeWindowSystems',
  meta_title_suffix: ' — Glaze',
  default_meta_description: '',
  maintenance_mode: false,
  maintenance_message: '',
}

const SiteSettingsContext = createContext({ settings: FALLBACK, loaded: false, live: false })

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    siteApi
      .getSettings(controller.signal)
      // Spread over FALLBACK rather than replacing it, so a field the API
      // omits keeps its shipped value instead of becoming undefined.
      .then((data) => {
        setSettings({ ...FALLBACK, ...data })
        setLive(true)
      })
      .catch(() => {
        // Expected whenever the backend is not running. Not an error worth
        // showing anyone — the fallback is already on screen.
      })
      .finally(() => setLoaded(true))

    return () => controller.abort()
  }, [])

  const value = useMemo(() => ({ settings, loaded, live }), [settings, loaded, live])

  return (
    <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}

export { FALLBACK as SITE_SETTINGS_FALLBACK }
