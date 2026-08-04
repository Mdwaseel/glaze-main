import { useEffect, useState } from 'react'
import { adminApi } from '@/services/admin'
import { useToast } from '@/components/admin/Toast'
import { Card, Empty, Loading, SelectField, TextArea, TextField, Toggle } from '@/components/admin/ui'
import Icon from '@/components/admin/Icon'
import { PageHead } from './AdminLayout'

/**
 * Contact settings — where enquiry emails go, and what the customer gets back.
 *
 * The auto-reply body is a raw HTML editor rather than a rich-text one, and
 * that is the correct choice here even though it is the harder one: email
 * clients only reliably render table layouts with inline styles, and every
 * WYSIWYG editor emits modern CSS that Outlook silently drops. Someone editing
 * this needs to see the actual markup.
 *
 * The preview iframe is sandboxed with no allow-* flags at all, so the markup
 * renders but cannot run script, submit forms, navigate the parent or reach
 * anything on the page. That matters because this content is later mailed to
 * real customers and a preview should never be able to act on the panel that
 * is displaying it.
 */
export default function ContactSettings() {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testCategory, setTestCategory] = useState('contact')
  const [sendingNotification, setSendingNotification] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .getContactSettings(controller.signal)
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
    try {
      const saved = await adminApi.updateContactSettings({
        recipient_emails: data.recipient_emails,
        contact_recipient_emails: data.contact_recipient_emails,
        product_recipient_emails: data.product_recipient_emails,
        general_recipient_emails: data.general_recipient_emails,
        subject_prefix: data.subject_prefix,
        subject_include_category: data.subject_include_category,
        notify_enabled: data.notify_enabled,
        auto_reply_enabled: data.auto_reply_enabled,
        auto_reply_subject: data.auto_reply_subject,
        auto_reply_html: data.auto_reply_html,
      })
      setData((prev) => ({ ...prev, ...saved }))
      toast.success('Contact settings saved.')
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

  const resetTemplate = () => {
    if (!window.confirm('Replace the auto-reply HTML with the default template? Your current version will be lost.')) return
    set('auto_reply_html', data.default_auto_reply_html)
    toast.success('Template reset. Save to apply it.')
  }

  const sendTest = async () => {
    setSendingTest(true)
    try {
      const result = await adminApi.sendTestAutoReply(testEmail)
      toast.success(result.detail)
    } catch (error) {
      // Surfaced, not swallowed — discovering SMTP is broken is the entire
      // point of a test send.
      toast.error(error.message)
    } finally {
      setSendingTest(false)
    }
  }

  /**
   * Send the staff notification for one enquiry type, to the addresses that
   * type is actually routed to.
   *
   * Deliberately NOT to the person clicking it. The auto-reply test above
   * proves SMTP works; this is the one that proves the routing does, and a
   * test that only ever mails yourself cannot tell you that the address you
   * typed for a colleague has a typo in it.
   */
  const sendNotificationTest = async () => {
    setSendingNotification(true)
    try {
      const result = await adminApi.sendTestNotification(testCategory)
      toast.success(result.detail)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSendingNotification(false)
    }
  }

  if (state === 'loading') return <><PageHead title="Contact settings" /><Loading rows={6} /></>
  if (state === 'failed') {
    return (
      <>
        <PageHead title="Contact settings" />
        <Empty title="Could not load settings">The server did not respond.</Empty>
      </>
    )
  }

  const fieldError = (name) => {
    const value = errors[name]
    return Array.isArray(value) ? value[0] : value
  }

  const recipientCount = data.recipient_emails
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean).length

  return (
    <>
      <PageHead
        title="Contact settings"
        subtitle="Configure where enquiry emails are delivered"
      >
        <button type="button" className="ad-btn ad-btn--primary" disabled={saving} onClick={save}>
          <Icon name="save" size={14} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </PageHead>

      <form onSubmit={save} style={{ display: 'grid', gap: '24px' }}>
        <Card
          title="Where enquiries go"
          hint="The default list, and then one optional list per enquiry type"
        >
          <TextArea
            label="Default recipients"
            required
            rows={2}
            value={data.recipient_emails}
            onChange={(v) => set('recipient_emails', v)}
            error={fieldError('recipient_emails')}
            hint={
              `Separate multiple addresses with commas. Used by any enquiry type below ` +
              `that is left blank — which is why at least one address is required. ` +
              `Currently ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}.`
            }
          />

          <TextField
            label="Email subject prefix"
            value={data.subject_prefix}
            onChange={(v) => set('subject_prefix', v)}
            placeholder="[Glaze Enquiry]"
            hint="Prepended to every email subject — helps filter in your inbox."
          />

          <Toggle
            checked={data.subject_include_category}
            onChange={(v) => set('subject_include_category', v)}
            label="Tag the subject with the enquiry type"
            hint={'e.g. "[Glaze Enquiry] [Product / system page] Priya Sharma". Worth leaving on when several types share an inbox — it is what a mail rule filters on.'}
          />

          <Toggle
            checked={data.notify_enabled}
            onChange={(v) => set('notify_enabled', v)}
            label="Send internal notification emails"
            hint="Off still records every enquiry in the inbox — it only stops the email going out."
          />
        </Card>

        {/*
          Routing.

          One inbox for everything is right for a small team and wrong for a
          growing one: an enquiry raised from a system page names the system,
          the variant and the finish and wants the specifier who can quote it,
          while "do you do commercial work" wants whoever answers the phone.

          Every field here is OPTIONAL and falls back to the default list
          above, so nothing changes until someone deliberately splits a type
          out — and no enquiry can ever be routed to nobody. The line under
          each field is the server's own answer to "who would actually get
          this", not the panel re-implementing the fallback rule.
        */}
        <Card
          title="Routing by enquiry type"
          hint="Optional. Each falls back to the default list above when left blank."
        >
          <RoutingField
            label="Contact page enquiries"
            hint="The consultation form on /contact — the general enquiries."
            category="contact"
            value={data.contact_recipient_emails}
            onChange={(v) => set('contact_recipient_emails', v)}
            error={fieldError('contact_recipient_emails')}
            routing={data.routing}
          />
          <RoutingField
            label="Product enquiries"
            hint="Raised from a system page, and carrying whatever the visitor configured there — system, variant, series, glass and finish."
            category="product"
            value={data.product_recipient_emails}
            onChange={(v) => set('product_recipient_emails', v)}
            error={fieldError('product_recipient_emails')}
            routing={data.routing}
          />
          <RoutingField
            label="General enquiries"
            hint="Everything else — the site assistant, direct API submissions, and any page that is neither the contact form nor a system page."
            category="general"
            value={data.general_recipient_emails}
            onChange={(v) => set('general_recipient_emails', v)}
            error={fieldError('general_recipient_emails')}
            routing={data.routing}
          />
        </Card>

        <Card
          title="Customer auto-reply"
          hint="Only sent when the visitor provided an email address"
        >
          <Toggle
            checked={data.auto_reply_enabled}
            onChange={(v) => set('auto_reply_enabled', v)}
            label="Send confirmation email to customer"
            hint="An automatic acknowledgement sent immediately after they submit."
          />

          <TextField
            label="Auto-reply subject"
            value={data.auto_reply_subject}
            onChange={(v) => set('auto_reply_subject', v)}
          />
        </Card>

        <Card
          title="Auto-reply email HTML"
          hint="Edit the HTML body sent to the customer"
          actions={
            <>
              <button
                type="button"
                className={`ad-btn ad-btn--sm${preview ? ' ad-btn--primary' : ''}`}
                onClick={() => setPreview((p) => !p)}
                aria-pressed={preview}
              >
                <Icon name="eye" size={13} /> {preview ? 'Editor' : 'Preview'}
              </button>
              <button type="button" className="ad-btn ad-btn--sm" onClick={resetTemplate}>
                <Icon name="refresh" size={13} /> Reset to default
              </button>
            </>
          }
        >
          {preview ? (
            <iframe
              title="Auto-reply preview"
              srcDoc={data.auto_reply_html}
              /* No allow-scripts, no allow-same-origin, no allow-forms.
                 An empty sandbox is the most restrictive setting there is:
                 the markup renders and can do nothing else. */
              sandbox=""
              style={{
                width: '100%', height: '620px', border: '1px solid var(--ad-line)',
                borderRadius: '3px', background: '#fff',
              }}
            />
          ) : (
            <TextArea
              label="HTML editor"
              code
              value={data.auto_reply_html}
              onChange={(v) => set('auto_reply_html', v)}
            />
          )}

          <div style={{ marginTop: '16px' }}>
            <p className="ad-card__title" style={{ marginBottom: '8px' }}>Available placeholders</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(data.placeholders || {}).map(([token, description]) => (
                <button
                  key={token}
                  type="button"
                  className="ad-pill ad-pill--draft"
                  style={{ cursor: 'copy' }}
                  title={`${description} — click to copy`}
                  onClick={() => {
                    navigator.clipboard?.writeText(token)
                    toast.success(`${token} copied.`)
                  }}
                >
                  {token}
                </button>
              ))}
            </div>
            <p className="ad-field__hint">
              Click a placeholder to copy it. Values are HTML-escaped when substituted,
              so a customer name containing markup cannot break the email.
            </p>
          </div>
        </Card>

        <Card title="Test send" hint="Check the template, the SMTP transport and the routing before a customer does it for you">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <TextField
                label="Send a test auto-reply to"
                type="email"
                value={testEmail}
                onChange={setTestEmail}
                placeholder="you@example.com"
                hint="What a customer gets back. Sends the saved template against a dummy enquiry — nothing is recorded."
              />
            </div>
            <button
              type="button"
              className="ad-btn"
              style={{ marginBottom: '28px' }}
              disabled={!testEmail.trim() || sendingTest}
              onClick={sendTest}
            >
              <Icon name="mail" size={14} /> {sendingTest ? 'Sending…' : 'Send test'}
            </button>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--ad-line)', margin: '4px 0 20px' }} />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <SelectField
                label="Send a test notification for"
                value={testCategory}
                onChange={setTestCategory}
                placeholder="— Choose an enquiry type —"
                options={(data.routing || []).map((row) => ({
                  value: row.category,
                  label: `${row.label} → ${row.recipients.join(', ') || 'nobody'}`,
                }))}
                hint="What the team gets. Goes to the SAVED recipients for that type, not to you — which is the only way to find out an address you typed for a colleague has a typo in it."
              />
            </div>
            <button
              type="button"
              className="ad-btn"
              style={{ marginBottom: '28px' }}
              disabled={!testCategory || sendingNotification}
              onClick={sendNotificationTest}
            >
              <Icon name="inbox" size={14} /> {sendingNotification ? 'Sending…' : 'Send notification'}
            </button>
          </div>
          <p className="ad-field__hint" style={{ marginTop: '-12px' }}>
            Save first — the test uses what is stored, not what is on screen.
          </p>
        </Card>
      </form>
    </>
  )
}

/**
 * One routing list, with the server's own answer to "who would actually get
 * this" underneath it.
 *
 * That line is read from the API's `routing` payload rather than worked out
 * here on purpose: the fallback ("blank means use the default list") is a
 * server rule, and a panel that re-implemented it would eventually disagree
 * with the code that sends the mail — which is the one disagreement in this
 * screen nobody would notice until an enquiry went missing.
 *
 * It is therefore the SAVED state, not the draft. Typing in the box does not
 * move it until Save, which is correct: it describes what would happen to an
 * enquiry arriving right now.
 */
function RoutingField({ label, hint, category, value, onChange, error, routing }) {
  const row = (routing || []).find((entry) => entry.category === category)

  return (
    <div>
      <TextArea
        label={label}
        rows={2}
        value={value ?? ''}
        onChange={onChange}
        error={error}
        hint={hint}
        placeholder="Leave blank to use the default list"
      />
      {row && (
        <p className="ad-field__hint" style={{ marginTop: '-10px' }}>
          <strong>Currently reaches:</strong> {row.recipients.join(', ') || 'nobody'}
          {row.using_default && ' (the default list)'}
        </p>
      )}
    </div>
  )
}
