"""Site-wide settings and the enquiry inbox.

Both settings models are singletons: exactly one row, fetched with .load().
A singleton table rather than a key/value store because these fields have
real types (EmailField, URLField, BooleanField) and Django's validation,
admin widgets and DRF serialisers all come free that way. A key/value bag
would turn every one of them into a string the application has to re-parse
and re-validate by hand.
"""

from pathlib import Path
from uuid import uuid4

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import models

from .defaults import DEFAULT_AUTO_REPLY_HTML


class SingletonModel(models.Model):
    """One row, pk=1, forever.

    save() pins the pk and delete() is a no-op, so the row cannot be removed
    out from under a template that reads it. load() creates it on first
    access, which means a fresh database needs no data migration or fixture
    to serve the site.
    """

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


def split_emails(value):
    """'a@b.com, c@d.com' -> ['a@b.com', 'c@d.com']. Blank in, empty out."""
    return [part.strip() for part in str(value or '').split(',') if part.strip()]


def validate_optional_email_list(value):
    """Every address must be valid, but the field may be empty.

    Partial acceptance would be worse than rejection: a typo'd address in a
    recipient list means enquiries silently stop reaching one person, and
    nobody notices until a customer complains about being ignored.

    Used by the per-type routing fields below, where empty is meaningful — it
    means "use the default list" rather than "send to nobody".
    """
    for address in split_emails(value):
        try:
            validate_email(address)
        except ValidationError:
            raise ValidationError(f'"{address}" is not a valid email address.')


def validate_email_list(value):
    """As above, and at least one address is required.

    This is the DEFAULT recipient list, which is the last line of routing: if
    it were allowed to be empty, an enquiry whose type has no list of its own
    would reach nobody at all.
    """
    if not split_emails(value):
        raise ValidationError('At least one recipient email address is required.')
    validate_optional_email_list(value)


class SiteSettings(SingletonModel):
    """Everything the public site reads at runtime instead of hard-coding.

    The React app pulls this once from /api/v1/site-settings/ and feeds it to
    the navbar, footer and contact sections, so changing the phone number
    here changes it in all three places without a redeploy.
    """

    # ── Identity ──────────────────────────────────────────────────────
    site_name = models.CharField(max_length=120, default='Glaze Window Systems')
    tagline = models.CharField(max_length=200, default='Designed to Disappear.')

    # ── Contact information (header, footer, contact sections) ────────
    contact_email = models.EmailField(default='info@glazewindowsystems.com')
    contact_phone = models.CharField(max_length=40, default='+91 76750 23939')
    contact_phone_secondary = models.CharField(max_length=40, blank=True)
    address = models.TextField(
        default='Glaze Windows System, 4th Floor, Road No. 5,\nJubilee Hills, Hyderabad, Telangana 500033',
    )
    map_url = models.URLField(
        max_length=600, blank=True,
        default='https://www.google.com/maps/search/?api=1&query=Glaze%20Windows%20System%2C%20Jubilee%20Hills%2C%20Hyderabad',
    )
    business_hours = models.CharField(max_length=200, default='Mon – Sat · 10:00 – 19:00')

    # ── WhatsApp ──────────────────────────────────────────────────────
    whatsapp_enabled = models.BooleanField(default=True)
    whatsapp_number = models.CharField(
        max_length=40, blank=True, default='+917675023939',
        help_text='Include the country code, e.g. +917675023939',
    )
    whatsapp_label = models.CharField(max_length=80, default='Enquire on WhatsApp')

    # ── Social ────────────────────────────────────────────────────────
    instagram_url = models.URLField(blank=True, default='https://www.instagram.com/glaze_window_systems/')
    facebook_url = models.URLField(blank=True, default='https://www.facebook.com/Glazewindowsystems')
    linkedin_url = models.URLField(blank=True, default='https://in.linkedin.com/company/glaze-window-systems')
    youtube_url = models.URLField(blank=True, default='https://www.youtube.com/@GlazeWindowSystems')

    # ── Default presentation ──────────────────────────────────────────
    LAYOUT_EDITORIAL = 'editorial'
    LAYOUT_COMPACT = 'compact'
    LAYOUT_CHOICES = [
        (LAYOUT_EDITORIAL, 'Editorial (full scroll experience)'),
        (LAYOUT_COMPACT, 'Clean compact view (fast navigation)'),
    ]
    system_page_layout = models.CharField(
        max_length=20, choices=LAYOUT_CHOICES, default=LAYOUT_EDITORIAL,
        help_text='Default layout for the six system pages unless a system overrides it.',
    )

    # ── SEO ───────────────────────────────────────────────────────────
    meta_title_suffix = models.CharField(max_length=80, default=' — Glaze')
    default_meta_description = models.CharField(
        max_length=200,
        default='Premium aluminium window and door systems, engineered to disappear into the architecture.',
    )
    default_og_image = models.ImageField(upload_to='site/', blank=True, null=True)

    # ── Geography, for LocalBusiness schema ───────────────────────────
    # Real coordinates of the premises. Schema.org LocalBusiness without geo
    # is the difference between "a company" and "a company you can drive to",
    # and local packs are most of the traffic for a business like this one.
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, default=17.4239,
        help_text='Decimal degrees, e.g. 17.423900. Right-click the premises in Google Maps.',
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, default=78.4138,
        help_text='Decimal degrees, e.g. 78.413800.',
    )

    # ── Analytics, advertising and verification ───────────────────────
    #
    # All of it is configured HERE and nowhere else — no ids in the bundle, no
    # redeploy to add a pixel, and one screen that answers "what is running on
    # this site". Every field is blank by default, and a blank field injects
    # nothing at all rather than an empty tag.
    ga_measurement_id = models.CharField(
        max_length=40, blank=True,
        help_text='Google Analytics 4 measurement ID (G-XXXXXXXX). Leave blank to use only '
                  'the built-in, cookie-free analytics.',
    )
    gtm_container_id = models.CharField(
        max_length=40, blank=True,
        help_text='Google Tag Manager container (GTM-XXXXXXX). Use this INSTEAD of the '
                  'individual ids above and below once the tracking stack is non-trivial — '
                  'running GTM and a hard-coded tag together double-counts everything.',
    )
    meta_pixel_id = models.CharField(
        max_length=32, blank=True,
        help_text='Meta (Facebook/Instagram) Pixel ID — the 15-16 digit number from Events '
                  'Manager. Powers ad conversion tracking and retargeting audiences.',
    )
    meta_pixel_track_enquiries = models.BooleanField(
        default=True,
        help_text='Fire a Lead event when someone submits an enquiry. This is what makes the '
                  'pixel worth having — without a conversion event the ad platform is '
                  'optimising blind.',
    )

    google_site_verification = models.CharField(
        max_length=120, blank=True,
        help_text='The content value of the google-site-verification meta tag, for Search '
                  'Console. Just the token, not the whole tag.',
    )
    bing_site_verification = models.CharField(
        max_length=120, blank=True,
        help_text='The content value of the msvalidate.01 meta tag, for Bing Webmaster Tools '
                  '— which also feeds ChatGPT search.',
    )
    facebook_domain_verification = models.CharField(
        max_length=120, blank=True,
        help_text='The content value of facebook-domain-verification, from Meta Business '
                  'Settings. Required before the pixel can be used for catalogue ads.',
    )

    # ── Kill switch ───────────────────────────────────────────────────
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.CharField(
        max_length=300, default='We are making some improvements. Please check back shortly.',
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'siteconfig_site_settings'
        verbose_name = 'site settings'
        verbose_name_plural = 'site settings'

    def __str__(self):
        return 'Site settings'

    @property
    def whatsapp_link(self):
        """wa.me wants digits only — no +, spaces or dashes."""
        if not (self.whatsapp_enabled and self.whatsapp_number):
            return ''
        digits = ''.join(ch for ch in self.whatsapp_number if ch.isdigit())
        return f'https://wa.me/{digits}' if digits else ''


class ContactSettings(SingletonModel):
    """Where enquiries go, and what the customer gets back.

    Kept apart from SiteSettings because the audiences differ: SiteSettings is
    served to every anonymous visitor, while this holds internal routing —
    recipient addresses are not something to hand out in a public payload.
    """

    recipient_emails = models.TextField(
        default='info@glazewindowsystems.com',
        validators=[validate_email_list],
        help_text='Comma-separated. The default list — used for any enquiry type '
                  'that has no list of its own, and the reason one is required.',
    )

    # ── Routing by where the enquiry came from ────────────────────────
    #
    # One inbox for everything is right for a small team and wrong for a
    # growing one: a product enquiry that names a system and a variant wants
    # the specifier who can quote it, while a general "do you do commercial
    # work" wants whoever answers the phone. Each of these is optional and
    # falls back to `recipient_emails`, so the behaviour is unchanged until
    # someone deliberately splits a type out.
    #
    # The CATEGORY IS DERIVED SERVER-SIDE from the page the enquiry was
    # submitted from (see Enquiry.categorise) rather than taken from the
    # payload. A routing key the client can set is a routing key an attacker
    # can set, and "send this to whichever inbox I name" is not a feature.
    contact_recipient_emails = models.TextField(
        blank=True, default='', validators=[validate_optional_email_list],
        help_text='Enquiries from the Contact page form. Blank uses the default list.',
    )
    product_recipient_emails = models.TextField(
        blank=True, default='', validators=[validate_optional_email_list],
        help_text='Enquiries raised from a system page, carrying the configured '
                  'system, variant, series, glass and finish. Blank uses the default list.',
    )
    general_recipient_emails = models.TextField(
        blank=True, default='', validators=[validate_optional_email_list],
        help_text='Everything else — the assistant, direct API submissions, and any '
                  'page that is not the contact form or a system page. '
                  'Blank uses the default list.',
    )

    subject_prefix = models.CharField(
        max_length=60, default='[Glaze Enquiry]',
        help_text='Prepended to every notification subject — helps filter in your inbox.',
    )
    subject_include_category = models.BooleanField(
        default=True,
        help_text='Add the enquiry type to the subject, e.g. "[Glaze Enquiry] [Product] '
                  'Priya Sharma". Worth leaving on if several types share one inbox — '
                  'it is what a mail rule can filter on.',
    )
    notify_enabled = models.BooleanField(
        default=True, help_text='Send the internal notification email on each enquiry.',
    )

    auto_reply_enabled = models.BooleanField(
        default=True, help_text='Send a confirmation email to the customer after they submit.',
    )
    auto_reply_subject = models.CharField(
        max_length=200, default='Thank you for contacting Glaze Window Systems',
    )
    auto_reply_html = models.TextField(default=DEFAULT_AUTO_REPLY_HTML)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'siteconfig_contact_settings'
        verbose_name = 'contact settings'
        verbose_name_plural = 'contact settings'

    def __str__(self):
        return 'Contact settings'

    @property
    def recipient_list(self):
        """The default list. Kept as the name every existing caller uses."""
        return split_emails(self.recipient_emails)

    def recipients_for(self, category):
        """Who gets an enquiry of this category.

        Falls back to the default list rather than to nobody, which is the
        whole safety property of this design: a category left blank, a
        category added in a later release, or a value that predates the field
        all still reach an inbox. Losing an enquiry to a routing gap is worse
        than sending one to the wrong colleague.
        """
        per_category = {
            Enquiry.CATEGORY_CONTACT: self.contact_recipient_emails,
            Enquiry.CATEGORY_PRODUCT: self.product_recipient_emails,
            Enquiry.CATEGORY_GENERAL: self.general_recipient_emails,
        }
        return split_emails(per_category.get(category)) or self.recipient_list


class Enquiry(models.Model):
    """One submission of the contact / system enquiry form.

    Stored as well as emailed. Email is a delivery channel, not a database:
    it gets filtered, deleted and lost, and once it is gone there is no record
    that the enquiry ever arrived. The row is the source of truth, and it is
    what the dashboard counts.
    """

    STATUS_NEW = 'new'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_CLOSED = 'closed'
    STATUS_SPAM = 'spam'
    STATUS_CHOICES = [
        (STATUS_NEW, 'New'),
        (STATUS_IN_PROGRESS, 'In progress'),
        (STATUS_CLOSED, 'Closed'),
        (STATUS_SPAM, 'Spam'),
    ]

    # Where it came from, which is what decides the inbox it goes to.
    #
    # Distinct from `enquiry_type`, which is the visitor's own answer to "what
    # are you building?" (Villa, Apartment, Commercial …) and is free text
    # chosen by whoever wrote the form. This is structural, closed, and
    # derived from the URL — the two answer different questions and merging
    # them would make routing depend on a form label.
    CATEGORY_GENERAL = 'general'
    CATEGORY_CONTACT = 'contact'
    CATEGORY_PRODUCT = 'product'
    CATEGORY_CHOICES = [
        (CATEGORY_GENERAL, 'General'),
        (CATEGORY_CONTACT, 'Contact form'),
        (CATEGORY_PRODUCT, 'Product / system page'),
    ]

    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)

    enquiry_type = models.CharField(max_length=60, blank=True)
    system = models.CharField(max_length=60, blank=True)
    variant = models.CharField(max_length=60, blank=True)
    message = models.TextField(blank=True)

    # ── The consultation form's own answers ───────────────────────────
    #
    # ⚠ COLUMNS, NOT PROSE. City, openings and timeline used to be appended
    # to `message` as "City: Hyderabad\n\nOpenings: 5–15\n\n…", because there
    # was nowhere else to put them. That was the right call when it was three
    # optional strings and the alternative was dropping them. It stops being
    # the right call here: the form now also asks budget, state, preferred
    # contact method and best time to call, and an enquiry whose budget lives
    # inside a paragraph cannot be filtered, sorted, counted or routed on.
    # The dashboard cannot answer "how many ₹10L+ enquiries this month" when
    # the answer is a substring.
    #
    # All blank=True: every one of these is optional on the form, and a
    # visitor who answers only "villa" and a phone number is still a lead.
    # WARNING: COUNTRY IS ASKED FIRST AND STORED SEPARATELY because `state`
    # is only unambiguous inside one. "Victoria" is an Australian state and
    # a district in several other places; "Selangor" means nothing without
    # Malaysia beside it. Folding the two into one string would have made
    # the column unfilterable the moment the second country was added.
    country = models.CharField(max_length=80, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    openings = models.CharField(max_length=40, blank=True)
    timeline = models.CharField(max_length=40, blank=True)
    budget = models.CharField(max_length=40, blank=True)
    contact_method = models.CharField(max_length=20, blank=True)
    contact_time = models.CharField(max_length=20, blank=True)

    # ⚠ `systems` DOES NOT REPLACE `system`, AND THAT IS DELIBERATE. Step 2
    # became multi-select, so the full answer is a list. But `system` is a
    # filter facet in the Django admin, a column in the dashboard inbox and
    # part of how notifications are routed — all of which expect one value.
    # So `system` keeps the FIRST choice and carries on working untouched,
    # and `systems` carries the whole answer. Storing only the list would
    # have meant migrating three consumers to parse a string.
    systems = models.CharField(
        max_length=300, blank=True,
        help_text='Every system chosen, comma-separated. `system` holds the first.',
    )

    source_path = models.CharField(max_length=300, blank=True)
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_GENERAL, db_index=True,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW, db_index=True)

    # Recorded for abuse handling. Nothing else reads it.
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    notified_at = models.DateTimeField(null=True, blank=True)
    auto_replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'siteconfig_enquiry'
        ordering = ('-created_at',)
        verbose_name_plural = 'enquiries'

    def __str__(self):
        return f'{self.name} — {self.system or self.enquiry_type or "general"}'

    @classmethod
    def categorise(cls, source_path):
        """Which inbox this belongs in, from the page it was submitted from.

        Derived rather than accepted: `source_path` is set by the browser, but
        it is a URL the visitor was actually on, not a routing key — and the
        worst a forged one can do is send an enquiry to the wrong colleague.
        A `category` field the client could set outright would let anyone pick
        which inbox to reach, which is a spam vector rather than a feature.

        Unrecognised paths fall to General, which is a real category with its
        own list rather than a bucket that goes nowhere.
        """
        path = (source_path or '').lower()
        if path.startswith('/products/'):
            return cls.CATEGORY_PRODUCT
        if path.startswith('/contact'):
            return cls.CATEGORY_CONTACT
        return cls.CATEGORY_GENERAL


def enquiry_attachment_path(instance, filename):
    """Where an uploaded drawing lands on disk.

    Foldered by enquiry id so one lead's files stay together and deleting the
    row can take its directory with it.

    ⚠ THE STORED NAME IS NOT THE UPLOADED NAME. Django will suffix a
    collision, but that is not what this is for: the uploaded name is
    attacker-controlled on a public endpoint, and it reaches a filesystem.
    `Path(filename).suffix` throws away any directory component — so
    "../../settings.py" arrives as ".py" — and the stem is replaced with a
    random token rather than sanitised, because sanitising means enumerating
    what is dangerous and the list is longer than it looks (NUL bytes,
    trailing dots and reserved device names on Windows, unicode
    right-to-left overrides that disguise the real extension).

    The visitor's own filename is still kept — in `original_name`, a database
    column, where it is data rather than a path.
    """
    suffix = Path(filename or '').suffix.lower()[:12]
    return f'enquiries/{instance.enquiry_id or "unfiled"}/{uuid4().hex}{suffix}'


class EnquiryAttachment(models.Model):
    """One drawing, plan or sketch attached to an enquiry.

    ⚠ THIS IS AN UNAUTHENTICATED UPLOAD ENDPOINT, which is the only fact that
    matters about it. Anyone on the internet can post here, so the limits are
    enforced server-side in the view (count, size, extension) and NOT trusted
    from the browser — the client-side checks in the form exist to give a
    visitor a fast, kind error, not to keep anything out.

    The three limits live here as constants so the serializer, the view and
    the admin all read the same numbers, and so the form's copy can be
    generated from them rather than repeating them by hand.
    """

    #: Per enquiry. Enough for a plan set; not enough to be storage.
    MAX_FILES = 6
    #: Per file. A scanned A1 elevation is comfortably under this.
    MAX_BYTES = 10 * 1024 * 1024

    #: ⚠ EXTENSION ALLOW-LIST, NOT A BLOCK-LIST. A block-list is a guess about
    #: what is dangerous; this is a statement about what a drawing is. SVG is
    #: absent on purpose — it is an image everywhere else on this site, but it
    #: is also a document that can carry script, and it would be served from
    #: our own origin.
    ALLOWED_SUFFIXES = ('.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif')

    enquiry = models.ForeignKey(
        Enquiry, related_name='attachments', on_delete=models.CASCADE,
    )
    file = models.FileField(upload_to=enquiry_attachment_path)
    #: What the visitor called it. Display only — never used to build a path.
    original_name = models.CharField(max_length=255, blank=True)
    size = models.PositiveIntegerField(default=0)
    content_type = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'siteconfig_enquiry_attachment'
        ordering = ('id',)

    def __str__(self):
        return self.original_name or self.file.name
