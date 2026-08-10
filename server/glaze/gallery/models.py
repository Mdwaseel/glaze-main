"""The gallery: completed work, photographed and filmed.

WHY IT IS A DATABASE AND NOT A FOLDER OF FILES

Every other image on this site is a build asset: it lives in `client/public`,
it is under version control, and putting a new one on the site means a
developer, a build and a deploy. That is the right trade for the hero clips
and the profile cross-sections, which change when the product changes.

It is the wrong trade for project photography, which is the one kind of media
this company generates continuously and by hand. A finished villa is shot on a
Tuesday and should be on the site on the Tuesday, added by whoever took the
photographs. So this is a table, edited in the Studio, exactly as the
catalogue and the journal are.

ONE MODEL, NOT TWO. A photograph and a film of the same balcony are the same
kind of thing to a visitor scrolling a gallery, and splitting them into
GalleryPhoto and GalleryVideo would mean two tables, two admin screens, two
API shapes and an interleaving problem the moment somebody wants them in one
grid. `kind` is a field.

THE MEDIA PAIRS follow catalogue/models.py exactly — a path AND an upload for
every asset, with `resolve()` preferring the upload. The reasoning is
transcribed there and unchanged here: an editor at 11pm cannot put a file in
`client/public`, and the assets that shipped with the migration should not be
re-uploaded to be usable.

WHAT A `poster` IS FOR. A video with no poster is a black rectangle until it
decodes, and a gallery of black rectangles is what a grid of `preload=none`
clips looks like on arrival. The field is optional and the client falls back
to the browser's own first frame, but the difference is visible.
"""

from django.core.exceptions import ValidationError
from django.db import models


def _resolve(uploaded, path):
    """Uploaded file if there is one, else the authored path/URL, else ''."""
    if uploaded:
        return uploaded.url
    return path or ''


class GalleryCategory(models.Model):
    """A filter tab on the gallery — "Villas", "Apartments", "Commercial".

    Its own table rather than a `choices` tuple on the item, because the
    categories are editorial: the set that suits this company's work in a
    year's time is not knowable now, and a `choices` list can only be changed
    by a developer writing a migration. The gallery page builds its filter bar
    from whatever is published here.

    ⚠ DELETING ONE DOES NOT DELETE ITS PHOTOGRAPHS. `on_delete=SET_NULL` on
    the item below: an uncategorised item still appears under "All", which is
    a tab losing its label rather than a shoot losing its images.
    """

    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(
        max_length=60, unique=True,
        help_text='Used in the filter bar and the deep link. Changing it breaks '
                  'a shared /gallery?filter=<slug> link.',
    )
    order = models.PositiveIntegerField(
        default=0, db_index=True,
        help_text='Position in the filter bar. Lower shows first.',
    )
    is_published = models.BooleanField(
        default=True,
        help_text='Off hides the tab. Its items stay on the site under "All".',
    )

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gallery_category'
        ordering = ('order', 'name')
        verbose_name_plural = 'Gallery categories'

    def __str__(self):
        return self.name


class GalleryItem(models.Model):
    """One photograph or one film in the gallery."""

    IMAGE = 'image'
    VIDEO = 'video'
    KIND_CHOICES = [
        (IMAGE, 'Photograph'),
        (VIDEO, 'Film'),
    ]

    kind = models.CharField(
        max_length=10, choices=KIND_CHOICES, default=IMAGE, db_index=True,
        help_text='Photograph or film. A film needs a poster as well, or it '
                  'shows as a black tile until it decodes.',
    )

    title = models.CharField(
        max_length=140,
        help_text='What this is — "Six-metre sliding elevation, Jubilee Hills". '
                  'Shown on the tile and used as the image\'s alt text if the '
                  'field below is left empty.',
    )
    caption = models.CharField(
        max_length=300, blank=True,
        help_text='Optional single line under the title in the lightbox. Not shown '
                  'on the tile.',
    )

    # ⚠ ALT TEXT IS A FIELD, not something the front end invents. Every other
    # image on this site has hand-written alt text in the JSX; these arrive
    # after the code does, so the only place the description can come from is
    # the row. Empty falls back to the title in the serialiser rather than to
    # an empty attribute — a photograph is content, not decoration.
    alt_text = models.CharField(
        max_length=250, blank=True,
        help_text='What a person who cannot see the image needs to know. Leave it '
                  'empty and the title is used — which is usually right, and is '
                  'always better than nothing.',
    )

    category = models.ForeignKey(
        GalleryCategory, related_name='items', on_delete=models.SET_NULL,
        blank=True, null=True,
        help_text='Which filter tab this appears under. Optional — an item with no '
                  'category still appears under "All".',
    )

    system = models.ForeignKey(
        'catalogue.System', related_name='gallery_items', on_delete=models.SET_NULL,
        blank=True, null=True,
        help_text='Optional. Which Glaze system is in the picture. It becomes a link '
                  'from the gallery into that system\'s page, which is the whole '
                  'reason to record it.',
    )

    # ── The media ─────────────────────────────────────────────────────
    # Path OR upload, for each. See the module docstring.
    image = models.CharField(
        max_length=300, blank=True,
        help_text='A path under client/public, or an absolute URL. Ignored if a '
                  'file is uploaded below.',
    )
    image_file = models.ImageField(upload_to='gallery/', blank=True, null=True)

    video = models.CharField(max_length=300, blank=True)
    video_file = models.FileField(upload_to='gallery/', blank=True, null=True)

    poster = models.CharField(
        max_length=300, blank=True,
        help_text='The still shown before a film plays.',
    )
    poster_file = models.ImageField(upload_to='gallery/posters/', blank=True, null=True)

    # ── Placement ─────────────────────────────────────────────────────
    is_featured = models.BooleanField(
        default=False,
        help_text='Featured items take a double-width tile in the grid. Use it '
                  'sparingly — a grid where everything is featured is a grid.',
    )
    order = models.PositiveIntegerField(
        default=0, db_index=True,
        help_text='Position in the grid. Lower shows first.',
    )
    is_published = models.BooleanField(
        default=True,
        help_text='Off removes it from the site without deleting it.',
    )

    shot_on = models.DateField(
        blank=True, null=True,
        help_text='Optional. Not shown on the page — it is here so the grid can be '
                  'ordered newest-first when nobody has set an order.',
    )

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gallery_item'
        # `-shot_on` before `-created_at`: an editor uploading a two-year-old
        # shoot today should not push this month's work down the page.
        ordering = ('order', '-shot_on', '-created_at')
        indexes = [
            models.Index(fields=('is_published', 'order'), name='gallery_pub_order_idx'),
        ]

    def __str__(self):
        return self.title

    def clean(self):
        """An item with no media is an empty tile, and the grid cannot render it.

        Enforced here rather than only in the serialiser so that the Django
        admin and any management command are held to the same rule as the
        Studio — there is one way for this row to be invalid and one place
        that says so.
        """
        if self.kind == self.VIDEO:
            if not (self.video or self.video_file):
                raise ValidationError({'video': 'A film needs a video file or a path.'})
        elif not (self.image or self.image_file):
            raise ValidationError({'image': 'A photograph needs an image file or a path.'})

    # ── Resolved media — what the API serialises ──────────────────────
    @property
    def image_url(self):
        return _resolve(self.image_file, self.image)

    @property
    def video_url(self):
        return _resolve(self.video_file, self.video)

    @property
    def poster_url(self):
        """The still for a film — its own poster, or its image field as a
        fallback, so an editor who filled in the wrong one still gets a tile
        with something in it rather than a black rectangle."""
        return _resolve(self.poster_file, self.poster) or self.image_url
