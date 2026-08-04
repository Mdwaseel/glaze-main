"""Sending the two enquiry emails.

Both are best-effort. An SMTP outage must not lose the enquiry or hand the
visitor a 500 — the row is already committed by the time we get here, so a
failed send is logged and the form still says "thank you". The admin panel
surfaces `notified_at` / `auto_replied_at` as null so an operator can see
which enquiries never went out.
"""

import logging
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.utils import timezone
from django.utils.html import escape

from .defaults import PLACEHOLDERS

logger = logging.getLogger(__name__)


def render_placeholders(template: str, enquiry, site) -> str:
    """Swap the fixed {{token}} vocabulary for this enquiry's values.

    A literal replace over a known list, not a template engine — see the note
    in defaults.py for why that distinction matters when the text is editable
    from a web form.

    Every substituted value is HTML-escaped. The enquiry fields are visitor
    input, and this string is about to be sent as text/html to a member of
    staff; without the escape a submitted name of `<script>…` would execute in
    a webmail client that renders it.
    """
    values = {
        '{{name}}': enquiry.name,
        '{{email}}': enquiry.email,
        '{{phone}}': enquiry.phone,
        '{{system}}': enquiry.system or enquiry.enquiry_type or 'our systems',
        '{{message}}': enquiry.message,
        '{{site_name}}': site.site_name,
        '{{contact_email}}': site.contact_email,
        '{{contact_phone}}': site.contact_phone,
        '{{whatsapp_link}}': site.whatsapp_link,
        '{{year}}': str(timezone.now().year),
    }
    # Unknown tokens are intentionally left in place rather than blanked, so a
    # typo shows up as {{naem}} in a test send instead of disappearing.
    for token in PLACEHOLDERS:
        template = template.replace(token, escape(str(values.get(token, ''))))
    return template


def _notification_html(enquiry, site) -> str:
    rows = [
        ('Name', enquiry.name),
        ('Email', enquiry.email),
        ('Phone', enquiry.phone),
        ('Category', _category_label(enquiry)),
        ('Enquiry type', enquiry.enquiry_type),
        ('System', enquiry.system),
        ('Variant', enquiry.variant),
        ('Submitted from', enquiry.source_path),
        ('Received', timezone.localtime(enquiry.created_at).strftime('%d %b %Y, %H:%M')),
    ]
    cells = ''.join(
        f'<tr><td style="padding:6px 14px 6px 0;color:#8A8A8A;font-size:12px;'
        f'text-transform:uppercase;letter-spacing:1px;white-space:nowrap;">{escape(label)}</td>'
        f'<td style="padding:6px 0;color:#1B1B1B;font-size:14px;">{escape(value or "—")}</td></tr>'
        for label, value in rows
    )
    message = escape(enquiry.message or '—').replace('\n', '<br>')

    return (
        '<div style="font-family:Helvetica,Arial,sans-serif;max-width:640px;">'
        f'<h2 style="font-weight:400;color:#1B1B1B;border-bottom:2px solid #726655;padding-bottom:10px;">'
        f'New enquiry — {escape(enquiry.name)}</h2>'
        f'<table cellpadding="0" cellspacing="0">{cells}</table>'
        '<p style="margin-top:22px;color:#8A8A8A;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Message</p>'
        f'<div style="background:#F5F5F3;border-left:2px solid #726655;padding:14px 18px;'
        f'color:#1B1B1B;font-size:14px;line-height:1.7;">{message}</div>'
        '</div>'
    )


def _category_label(enquiry) -> str:
    """"Product / system page" — the display name, or the raw value if the
    row predates a category being added."""
    try:
        return enquiry.get_category_display()
    except (AttributeError, TypeError):
        return str(getattr(enquiry, 'category', '') or '')


def notification_subject(contact, enquiry) -> str:
    """[Glaze Enquiry] [Product] Priya Sharma

    The category tag is the thing a mail rule can filter on, which is what
    makes one shared inbox workable when the routing lists overlap — and they
    usually do, because info@ tends to be on all of them.
    """
    parts = [contact.subject_prefix.strip()]
    if contact.subject_include_category:
        label = _category_label(enquiry)
        if label:
            parts.append(f'[{label}]')
    parts.append(enquiry.name or 'New enquiry')
    return ' '.join(part for part in parts if part)


def send_enquiry_emails(enquiry) -> dict:
    """Fire the internal notification and the customer auto-reply.

    Returns what actually went out so the caller can report it, and stamps the
    enquiry row. One SMTP connection is opened for both messages rather than
    one each — on a slow relay that halves the visitor's wait.
    """
    from .models import ContactSettings, SiteSettings

    contact = ContactSettings.load()
    site = SiteSettings.load()
    result = {'notified': False, 'auto_replied': False, 'recipients': []}

    # ⚠ ROUTED BY CATEGORY, falling back to the default list. See
    # ContactSettings.recipients_for: an enquiry whose type has no list of its
    # own still reaches an inbox rather than nobody.
    recipients = contact.recipients_for(enquiry.category)
    result['recipients'] = recipients

    want_notify = contact.notify_enabled and recipients
    want_reply = contact.auto_reply_enabled and enquiry.email
    if not (want_notify or want_reply):
        return result

    try:
        connection = get_connection(fail_silently=False)
    except Exception:
        logger.exception('Enquiry %s: could not open a mail connection', enquiry.pk)
        return result

    if want_notify:
        try:
            mail = EmailMultiAlternatives(
                subject=notification_subject(contact, enquiry),
                body=f'New enquiry from {enquiry.name} ({enquiry.email or "no email"}).\n\n{enquiry.message}',
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=recipients,
                # So hitting Reply in the inbox goes to the customer, not to
                # the no-reply sender address.
                reply_to=[enquiry.email] if enquiry.email else None,
                connection=connection,
            )
            mail.attach_alternative(_notification_html(enquiry, site), 'text/html')
            mail.send()
            result['notified'] = True
            enquiry.notified_at = timezone.now()
        except Exception:
            logger.exception('Enquiry %s: notification email failed', enquiry.pk)

    if want_reply:
        try:
            html = render_placeholders(contact.auto_reply_html, enquiry, site)
            subject = render_placeholders(contact.auto_reply_subject, enquiry, site)
            mail = EmailMultiAlternatives(
                subject=subject,
                body='Thank you for contacting us. We will be in touch shortly.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[enquiry.email],
                reply_to=[site.contact_email] if site.contact_email else None,
                connection=connection,
            )
            mail.attach_alternative(html, 'text/html')
            mail.send()
            result['auto_replied'] = True
            enquiry.auto_replied_at = timezone.now()
        except Exception:
            logger.exception('Enquiry %s: auto-reply email failed', enquiry.pk)

    try:
        connection.close()
    except Exception:
        pass

    enquiry.save(update_fields=['notified_at', 'auto_replied_at'])
    return result


def _sample_enquiry(to_email, site, category):
    """A throwaway with the same attribute surface the renderers read.

    No row is written and nothing is counted — a test send that appeared in
    the inbox and on the dashboard would be worse than no test send.
    """
    from .models import Enquiry

    return type('SampleEnquiry', (), {
        'name': 'Test Recipient',
        'email': to_email,
        'phone': site.contact_phone,
        'system': 'Sliding',
        'variant': '3 Track Sliding Door',
        'enquiry_type': 'Test',
        'category': category,
        'get_category_display': lambda self=None, c=category: dict(Enquiry.CATEGORY_CHOICES).get(c, c),
        'message': 'This is a preview. No enquiry was recorded.',
        'created_at': datetime.now(dt_timezone.utc),
        'source_path': '/admin/settings/contact',
    })()


def send_test_auto_reply(to_email: str) -> None:
    """Preview the auto-reply against a dummy enquiry.

    Lets an admin confirm their HTML edits render before a real customer sees
    them.
    """
    from .models import ContactSettings, Enquiry, SiteSettings

    contact = ContactSettings.load()
    site = SiteSettings.load()
    sample = _sample_enquiry(to_email, site, Enquiry.CATEGORY_CONTACT)

    mail = EmailMultiAlternatives(
        subject=f'[TEST] {render_placeholders(contact.auto_reply_subject, sample, site)}',
        body='Preview of the automatic reply.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    mail.attach_alternative(render_placeholders(contact.auto_reply_html, sample, site), 'text/html')
    mail.send()


def send_test_notification(category: str, to_email: str = '') -> list:
    """Send the staff notification for one category, and return who got it.

    This is the test that matters for routing. The auto-reply test proves SMTP
    works; this proves that an enquiry of a given type reaches the people the
    settings say it should — which is the question the routing fields raise
    and the one nobody can answer by reading a form.

    With no `to_email` it goes to the REAL routed recipients, deliberately: a
    test that only ever mails the person running it cannot tell them the
    address they typed for someone else has a typo in it.
    """
    from .models import ContactSettings, SiteSettings

    contact = ContactSettings.load()
    site = SiteSettings.load()
    sample = _sample_enquiry(to_email or site.contact_email, site, category)

    recipients = [to_email] if to_email else contact.recipients_for(category)
    if not recipients:
        raise ValueError('No recipients are configured for this enquiry type.')

    mail = EmailMultiAlternatives(
        subject=f'[TEST] {notification_subject(contact, sample)}',
        body='Preview of the internal enquiry notification. No enquiry was recorded.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    mail.attach_alternative(_notification_html(sample, site), 'text/html')
    mail.send()
    return recipients
