import { useEffect, useState } from 'react'
import { adminApi, toRequestBody } from '@/services/admin'
import { mediaUrl } from '@/services/api'
import { useToast } from '@/components/admin/Toast'
import {
  Card, Empty, ImageUpload, Loading, SelectField, TextArea, TextField, Toggle,
} from '@/components/admin/ui'
import Icon from '@/components/admin/Icon'
import { PageHead } from './AdminLayout'

/**
 * Site settings — the values the public site reads at runtime.
 *
 * Changing the phone number here changes it in the navbar, the footer and
 * every contact section at once, with no redeploy. That works because
 * SiteSettingsContext fetches this on boot and the components read it from
 * there rather than from the hard-coded constants they shipped with.
 *
 * Those constants still exist and are still the fallback. If this API is
 * unreachable the site shows what it shipped with rather than an empty
 * contact block — see SiteSettingsContext for the reasoning.
 */
export default function SiteSettings() {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const toast = useToast()

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .getSiteSettings(controller.signal)
      .then((result) => {
        setData(result)
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })
    return () => controller.abort()
  }, [])

  const set = (key, value) => setData((prev) => ({ ...prev, [key]: value }))

  const save = async (event) => {
    event?.preventDefault()
    setSaving(true)
    setErrors({})

    const payload = { ...data }
    delete payload.updated_at
    delete payload.whatsapp_link   // derived server-side from the number

    // A cleared coordinate is "no coordinate", not the empty string — DRF's
    // DecimalField rejects '' outright, so clearing the field would fail
    // validation on a value the model is perfectly happy to hold as null.
    ;['latitude', 'longitude'].forEach((key) => {
      if (payload[key] === '' || payload[key] === undefined) payload[key] = null
    })

    try {
      const saved = await adminApi.updateSiteSettings(
        toRequestBody(payload, ['default_og_image']),
      )
      setData((prev) => ({ ...prev, ...saved, default_og_image: saved.default_og_image }))
      toast.success('Site settings saved. The public site picks these up on its next load.')
    } catch (error) {
      if (error.fields) {
        setErrors(error.fields)
        toast.error('Please check the highlighted fields.')
      } else {
        toast.error(error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  if (state === 'loading') return <><PageHead title="Site settings" /><Loading rows={6} /></>
  if (state === 'failed') {
    return (
      <>
        <PageHead title="Site settings" />
        <Empty title="Could not load settings">The server did not respond.</Empty>
      </>
    )
  }

  const fieldError = (name) => {
    const value = errors[name]
    return Array.isArray(value) ? value[0] : value
  }

  const savedOg = typeof data.default_og_image === 'string' ? data.default_og_image : null

  return (
    <>
      <PageHead title="Site settings" subtitle="Global settings applied across the entire website">
        <button type="button" className="ad-btn ad-btn--primary" disabled={saving} onClick={save}>
          <Icon name="save" size={14} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </PageHead>

      <form onSubmit={save} style={{ display: 'grid', gap: '24px' }}>
        <Card title="Identity">
          <TextField
            label="Site name"
            value={data.site_name}
            onChange={(v) => set('site_name', v)}
            error={fieldError('site_name')}
          />
          <TextField
            label="Tagline"
            value={data.tagline}
            onChange={(v) => set('tagline', v)}
            hint="Shown under the logo in the footer."
          />
        </Card>

        <Card
          title="Contact information"
          hint="Shown in the header, footer and contact sections"
        >
          <TextField
            label="Email address"
            type="email"
            value={data.contact_email}
            onChange={(v) => set('contact_email', v)}
            error={fieldError('contact_email')}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <TextField
              label="Phone number"
              value={data.contact_phone}
              onChange={(v) => set('contact_phone', v)}
              error={fieldError('contact_phone')}
            />
            <TextField
              label="Secondary phone"
              value={data.contact_phone_secondary}
              onChange={(v) => set('contact_phone_secondary', v)}
              hint="Optional."
            />
          </div>
          <TextArea
            label="Address"
            rows={3}
            value={data.address}
            onChange={(v) => set('address', v)}
          />
          <TextField
            label="Map link"
            type="url"
            value={data.map_url}
            onChange={(v) => set('map_url', v)}
            hint="Where the footer address links to."
          />
          <TextField
            label="Business hours"
            value={data.business_hours}
            onChange={(v) => set('business_hours', v)}
          />
        </Card>

        <Card
          title="WhatsApp configuration"
          hint="Global WhatsApp number used for all enquiry buttons"
        >
          <Toggle
            checked={data.whatsapp_enabled}
            onChange={(v) => set('whatsapp_enabled', v)}
            label="Show WhatsApp enquiry buttons"
          />
          <TextField
            label="WhatsApp number"
            value={data.whatsapp_number}
            onChange={(v) => set('whatsapp_number', v)}
            placeholder="+917675023939"
            hint="Include the country code, e.g. +917675023939. Spaces and dashes are stripped for the link."
            error={fieldError('whatsapp_number')}
          />
          <TextField
            label="WhatsApp button label"
            value={data.whatsapp_label}
            onChange={(v) => set('whatsapp_label', v)}
          />
          {data.whatsapp_link && (
            <p className="ad-field__hint">
              Resolved link: <code>{data.whatsapp_link}</code>
            </p>
          )}
        </Card>

        <Card title="Social profiles">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <TextField label="Instagram" type="url" value={data.instagram_url} onChange={(v) => set('instagram_url', v)} />
            <TextField label="Facebook" type="url" value={data.facebook_url} onChange={(v) => set('facebook_url', v)} />
            <TextField label="LinkedIn" type="url" value={data.linkedin_url} onChange={(v) => set('linkedin_url', v)} />
            <TextField label="YouTube" type="url" value={data.youtube_url} onChange={(v) => set('youtube_url', v)} />
          </div>
        </Card>

        <Card
          title="Default design settings"
          hint="Select the default layout for the system pages"
        >
          <SelectField
            label="Global system page layout"
            value={data.system_page_layout}
            onChange={(v) => set('system_page_layout', v)}
            placeholder="Editorial (full scroll experience)"
            options={[
              { value: 'editorial', label: 'Editorial (full scroll experience)' },
              { value: 'compact', label: 'Clean compact view (fast navigation)' },
            ]}
            hint="Used for all six system pages unless a system overrides it."
          />
        </Card>

        <Card title="SEO defaults">
          <TextField
            label="Meta title suffix"
            value={data.meta_title_suffix}
            onChange={(v) => set('meta_title_suffix', v)}
            limit={80}
            hint="Appended to page titles, e.g. “ — Glaze”."
          />
          <TextArea
            label="Default meta description"
            limit={200}
            rows={2}
            value={data.default_meta_description}
            onChange={(v) => set('default_meta_description', v)}
            hint="Used on pages that do not set their own."
          />
          <ImageUpload
            label="Default social share image"
            hint="1200 × 630px. Shown when a page without its own image is shared."
            value={data.default_og_image}
            previewUrl={mediaUrl(savedOg)}
            onChange={(file) => set('default_og_image', file)}
            onClear={() => set('default_og_image', null)}
          />
        </Card>

        {/*
          Everything a third party runs on this site, in one place.

          It is a setting rather than a build-time constant so marketing can
          open an ad account without a developer, a rebuild and a deploy —
          and so there is one screen that answers "what is running on this
          site". A blank field injects nothing at all.
        */}
        <Card
          title="Advertising & analytics"
          hint="Meta Pixel, Google Analytics and Tag Manager. Each takes effect on the public site immediately; none of them run inside this panel."
        >
          <TextField
            label="Meta Pixel ID"
            value={data.meta_pixel_id}
            onChange={(v) => set('meta_pixel_id', v)}
            placeholder="1234567890123456"
            hint="From Meta Events Manager — the 15-16 digit number, not the whole snippet. Powers Facebook and Instagram ad conversion tracking and retargeting audiences."
          />
          <Toggle
            checked={data.meta_pixel_track_enquiries}
            onChange={(v) => set('meta_pixel_track_enquiries', v)}
            label="Report enquiries as conversions"
            hint="Fires a Lead event when an enquiry is ACCEPTED by the server, not when the button is clicked — counting failed submissions would have the ad platform buy more of them."
          />

          <p className="ad-field__hint" style={{ margin: '4px 0 18px', lineHeight: 1.7 }}>
            <strong>Before you turn the pixel on.</strong> Everything else on
            this site is first-party and cookie-free by design — no cookie, no
            IP stored. The Meta Pixel is third-party tracking: it sets cookies
            and sends visitor data to Meta, and in the EU and UK it needs
            consent before it may fire. There is no consent banner on this site
            yet, so leave this blank until either the audience is outside those
            jurisdictions or a banner is in place.
          </p>

          <TextField
            label="Google Analytics measurement ID"
            value={data.ga_measurement_id}
            onChange={(v) => set('ga_measurement_id', v)}
            placeholder="G-XXXXXXXXXX"
            hint="Optional. The built-in, cookie-free analytics run regardless and need no third party."
          />
          <TextField
            label="Google Tag Manager container ID"
            value={data.gtm_container_id}
            onChange={(v) => set('gtm_container_id', v)}
            placeholder="GTM-XXXXXXX"
            hint="⚠ Use this INSTEAD of the two fields above, not as well. A container usually carries GA4 and the pixel itself, and running both counts every pageview and every conversion twice."
          />
        </Card>

        <Card
          title="Search engine verification"
          hint="The token only, not the whole meta tag. Each renders in the page head so the platform can confirm you own the domain."
        >
          <TextField
            label="Google Search Console"
            value={data.google_site_verification}
            onChange={(v) => set('google_site_verification', v)}
            hint="The content value of the google-site-verification tag. Search Console is also where the sitemap at /sitemap.xml is submitted."
          />
          <TextField
            label="Bing Webmaster Tools"
            value={data.bing_site_verification}
            onChange={(v) => set('bing_site_verification', v)}
            hint="The content value of msvalidate.01. Worth doing even if Bing traffic is small — it is what feeds ChatGPT's search index."
          />
          <TextField
            label="Meta domain verification"
            value={data.facebook_domain_verification}
            onChange={(v) => set('facebook_domain_verification', v)}
            hint="From Meta Business Settings. Required before the pixel can be used for catalogue ads."
          />
        </Card>

        <Card
          title="Map location"
          hint="Where the premises actually are. Used by the LocalBusiness structured data, which is what puts a business in the local results."
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <TextField
              label="Latitude"
              value={data.latitude ?? ''}
              onChange={(v) => set('latitude', v)}
              placeholder="17.423900"
              hint="Decimal degrees."
            />
            <TextField
              label="Longitude"
              value={data.longitude ?? ''}
              onChange={(v) => set('longitude', v)}
              placeholder="78.413800"
              hint="Right-click the premises in Google Maps to read both."
            />
          </div>
        </Card>

        <Card title="Maintenance mode">
          <Toggle
            checked={data.maintenance_mode}
            onChange={(v) => set('maintenance_mode', v)}
            label="Show a maintenance notice on the public site"
            hint="The admin panel stays reachable while this is on."
          />
          <TextField
            label="Maintenance message"
            value={data.maintenance_message}
            onChange={(v) => set('maintenance_message', v)}
            limit={300}
          />
        </Card>
      </form>
    </>
  )
}
