"""The product catalogue: systems and the variants each is built in.

WHAT MOVED, AND WHY IT IS A DATABASE NOW

Until this app existed the seven systems lived in `client/src/data/systems.js`
and their variants in `client/src/data/variants.js` — hand-authored modules
compiled into the bundle. That was right while the site was a migration of six
static pages: the data WAS the markup, and there was nothing to edit it with.

It stops being right the moment someone who does not have the repository needs
to add a variant. A new format meant a developer, an editor, a build and a
deploy to publish four rows of specification and a video. These two models are
the same shape as those two modules, field for field, so nothing about how the
pages render had to change — only where the values come from.

The JS modules are NOT deleted. They remain the seed for this table (see
`manage.py seed_catalogue`) and the client's offline fallback, exactly as
`constants/navigation.js` is the fallback for SiteSettings: a marketing site
whose backend is unreachable must still show its own products.

THE MEDIA PAIRS

Every clip, still and poster is TWO fields — a path and an upload:

    hero_video       '/videos/sliding.mp4'   a path in client/public, or any
                                             absolute URL
    hero_video_file  an uploaded file        served from MEDIA_URL

`resolve()` prefers the upload. Both exist because the two ways of getting a
file onto this site are both legitimate and neither covers the other: the
clips that shipped with the migration are build assets under version control
and referencing them by path costs nothing, while an admin adding an eighth
system at 11pm has no way to put a file in `client/public` and should not
need one.

WHAT IS NOT HERE

The twelve PROFILE SERIES (GWS-N1-60H and friends) are still static. A series
is a tested extrusion with certificates behind its numbers — it changes when
the factory changes, not when marketing does, and putting a U-value behind an
editable text box invites a typo into a claim the company has to stand behind.
`fits` and `series_order` below reference those series by id; the admin picks
from the known list rather than typing one.
"""

from django.db import models


def _resolve(uploaded, path):
    """Uploaded file if there is one, else the authored path/URL, else ''."""
    if uploaded:
        return uploaded.url
    return path or ''


class System(models.Model):
    """One window or door system — one /products/<slug> page.

    Field groups map one-to-one onto the page's sections, which is what keeps
    the admin editor readable: §Hero, §Overview, §Series, plus the two places
    a system appears without being the subject — the carousel card on Home and
    /systems, and the chip in the contact form.
    """

    # ── Identity ──────────────────────────────────────────────────────
    slug = models.SlugField(
        max_length=60, unique=True,
        help_text='The URL: /products/<slug>. Changing it breaks existing links.',
    )
    name = models.CharField(
        max_length=60,
        help_text='How the system is named everywhere it is referred to — cards, '
                  'cross-links, the enquiry form. e.g. "Lift & Slide".',
    )
    order = models.PositiveIntegerField(
        default=0, db_index=True,
        help_text='Position in the carousel, the footer column and the cross-links. '
                  'Lower shows first.',
    )
    is_published = models.BooleanField(
        default=True,
        help_text='Off removes the system from the site — every card, list and '
                  'form option — without deleting it or its variants.',
    )

    # ── <head> ────────────────────────────────────────────────────────
    page_title = models.CharField(max_length=140, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    schema_name = models.CharField(max_length=140, blank=True)
    schema_category = models.CharField(max_length=140, blank=True)
    schema_description = models.CharField(max_length=400, blank=True)

    # ── §01 Hero ──────────────────────────────────────────────────────
    # Five of the seven run a clip; Fixed ships a still, because there is no
    # footage of a window that does not move. Whichever is set is what the
    # hero renders — see SystemHeroSection.
    hero_video = models.CharField(max_length=300, blank=True)
    hero_video_file = models.FileField(upload_to='catalogue/hero/', blank=True, null=True)
    hero_image = models.CharField(max_length=300, blank=True)
    hero_image_file = models.ImageField(upload_to='catalogue/hero/', blank=True, null=True)
    hero_title = models.CharField(max_length=80, blank=True)
    hero_accent = models.CharField(max_length=120, blank=True)
    hero_lede = models.CharField(max_length=400, blank=True)

    # ── §03 Overview ──────────────────────────────────────────────────
    overview_title_lead = models.CharField(max_length=120, blank=True)
    overview_title_em = models.CharField(max_length=120, blank=True)
    chips = models.JSONField(default=list, blank=True, help_text='["Panoramic", …]')
    overview_body = models.JSONField(default=list, blank=True, help_text='["paragraph", …]')
    # [{to, dec, unit, key}] — `to` is the number the counter runs to and `dec`
    # how many decimals it keeps, so "2.087" does not animate to "2.1". Pivot
    # ships three and Fixed two; the section renders what it is given rather
    # than padding to four.
    stats = models.JSONField(default=list, blank=True)
    strengths = models.JSONField(default=list, blank=True, help_text='[{title, copy}, …]')

    # ── §05 Series ────────────────────────────────────────────────────
    series_note = models.CharField(max_length=300, blank=True)
    fits = models.JSONField(
        default=list, blank=True,
        help_text='Series ids flagged "For <System>" on this page, e.g. ["105","135"].',
    )
    series_order = models.JSONField(
        default=list, blank=True,
        help_text='All twelve series ids in this page\'s grid order.',
    )

    # ── The carousel card (Home + /systems) and the cross-links ───────
    card_video = models.CharField(max_length=300, blank=True)
    card_video_file = models.FileField(upload_to='catalogue/cards/', blank=True, null=True)
    card_poster = models.CharField(max_length=300, blank=True)
    card_poster_file = models.ImageField(upload_to='catalogue/cards/', blank=True, null=True)
    card_image = models.CharField(max_length=300, blank=True)
    card_image_file = models.ImageField(upload_to='catalogue/cards/', blank=True, null=True)

    # The copy beside the card when it reaches the apex of the carousel.
    teaser_lead = models.CharField(max_length=80, blank=True)
    teaser_em = models.CharField(max_length=80, blank=True)
    teaser_desc = models.TextField(blank=True)
    teaser_specs = models.JSONField(default=list, blank=True, help_text='Three short strings.')
    teaser_cta = models.CharField(max_length=80, blank=True)

    # ── The enquiry forms ─────────────────────────────────────────────
    enquiry_note = models.CharField(
        max_length=300, blank=True,
        help_text='One line shown under the system chips on the contact form when '
                  'this system is chosen.',
    )

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'catalogue_system'
        ordering = ('order', 'name')

    def __str__(self):
        return self.name

    # Resolved media — what the API serialises and the page renders.
    @property
    def hero_video_url(self):
        return _resolve(self.hero_video_file, self.hero_video)

    @property
    def hero_image_url(self):
        return _resolve(self.hero_image_file, self.hero_image)

    @property
    def card_video_url(self):
        return _resolve(self.card_video_file, self.card_video)

    @property
    def card_poster_url(self):
        return _resolve(self.card_poster_file, self.card_poster)

    @property
    def card_image_url(self):
        return _resolve(self.card_image_file, self.card_image)


class Variant(models.Model):
    """One format a system is built in — the §04 clip reel, and the enquiry
    form's variant list.

    A SERIES is a profile: an extrusion depth with tested numbers. A VARIANT
    is a configuration: how many leaves, which way they open, where the track
    runs. Orthogonal, which is why they are separate things and why a variant
    carries no U-value — its `specs` rows are architectural.

    Adding one here is the whole publishing flow: it appears in §04 on the
    system page, and in the contact form's variant list under its system, with
    no deploy. That is the automation the brief asked for — nothing enumerates
    variants anywhere else.
    """

    system = models.ForeignKey(System, related_name='variants', on_delete=models.CASCADE)

    key = models.SlugField(
        max_length=60,
        help_text='Stable id within the system — also the clip filename. e.g. "two-track-door".',
    )
    name = models.CharField(max_length=90, help_text='As a specifier would name it.')
    kind = models.CharField(
        max_length=60, blank=True,
        help_text='The eyebrow: "Window", "Door", "Door & Screen".',
    )
    lede = models.CharField(
        max_length=200, blank=True,
        help_text='ONE short sentence, ~55-65 characters. It sits over the clip, and '
                  'every line of prose in front of the picture is a line of the '
                  'product hidden.',
    )
    # [{k, v}] — four rows, label over value. Four is what the panel is drawn
    # for; more overflows the glass card, fewer leaves it looking unfinished.
    specs = models.JSONField(default=list, blank=True)

    video = models.CharField(max_length=300, blank=True)
    video_file = models.FileField(upload_to='catalogue/variants/', blank=True, null=True)
    poster = models.CharField(max_length=300, blank=True)
    poster_file = models.ImageField(upload_to='catalogue/variants/', blank=True, null=True)

    order = models.PositiveIntegerField(default=0, db_index=True)
    is_published = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'catalogue_variant'
        ordering = ('order', 'id')
        constraints = [
            models.UniqueConstraint(fields=('system', 'key'), name='catalogue_variant_unique_key'),
        ]

    def __str__(self):
        return f'{self.system.name} — {self.name}'

    @property
    def video_url(self):
        return _resolve(self.video_file, self.video)

    @property
    def poster_url(self):
        return _resolve(self.poster_file, self.poster)
