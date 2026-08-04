"""Blog content: categories, authors, tags, posts and comments."""

import math
import re

from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from .sanitize import sanitize_html, strip_tags_for_count


def unique_slug(instance, value, field_name='slug'):
    """Slugify `value` and suffix it until it is unique for this model.

    Excludes the instance's own pk so re-saving an existing post does not
    collide with itself and creep to my-post-2, my-post-3 on every edit.
    """
    base = slugify(value)[:200] or 'untitled'
    model = instance.__class__
    candidate = base
    suffix = 2

    while model.objects.filter(**{field_name: candidate}).exclude(pk=instance.pk).exists():
        candidate = f'{base}-{suffix}'
        suffix += 1

    return candidate


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    description = models.CharField(max_length=300, blank=True)
    # Bronze by default so a category with no colour still looks intentional
    # rather than falling back to browser blue.
    accent_color = models.CharField(max_length=7, default='#726655')
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blog_category'
        ordering = ('order', 'name')
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name)
        super().save(*args, **kwargs)


class Tag(models.Model):
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(max_length=70, unique=True, blank=True)

    class Meta:
        db_table = 'blog_tag'
        ordering = ('name',)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name)
        super().save(*args, **kwargs)


class Author(models.Model):
    """A byline.

    Separate from account.User on purpose. The person who writes a post is not
    necessarily the person who logs in to publish it, and a byline needs a
    public bio, portrait and role that have no business hanging off a login
    account. `user` links the two when they do happen to be the same person.
    """

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=130, unique=True, blank=True)
    role = models.CharField(max_length=120, blank=True, help_text='e.g. Head of Systems Engineering')
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='authors/', blank=True, null=True)
    email = models.EmailField(blank=True)
    linkedin_url = models.URLField(blank=True)
    user = models.OneToOneField(
        'account.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='author_profile',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blog_author'
        ordering = ('name',)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name)
        super().save(*args, **kwargs)


class PostQuerySet(models.QuerySet):
    def published(self):
        """Live to the public right now.

        Both conditions matter: status alone would leak a scheduled post the
        moment it was saved, and published_at alone would expose a draft that
        happens to carry a past date.
        """
        return self.filter(status=Post.STATUS_PUBLISHED, published_at__lte=timezone.now())


class Post(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_SCHEDULED = 'scheduled'
    STATUS_PUBLISHED = 'published'
    STATUS_ARCHIVED = 'archived'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_ARCHIVED, 'Archived'),
    ]

    # ── Content ───────────────────────────────────────────────────────
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    excerpt = models.TextField(
        max_length=400, help_text='1–2 sentences, used in listings and as the meta description fallback.',
    )
    content = models.TextField(
        help_text=(
            'HTML is accepted: h2, h3, p, ul, ol, table, blockquote. Callout components: '
            'wrap in <div class="bl-tip">, bl-expert, bl-insight, bl-note, bl-warning.'
        ),
    )
    takeaways = models.TextField(
        blank=True, help_text='One per line. Rendered as the Key Takeaways box. Blank hides the box.',
    )

    # ── Featured image ────────────────────────────────────────────────
    featured_image = models.ImageField(upload_to='blog/%Y/%m/', blank=True, null=True)
    image_alt = models.CharField(max_length=250, blank=True)

    # ── Taxonomy ──────────────────────────────────────────────────────
    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL, related_name='posts',
    )
    author = models.ForeignKey(
        Author, null=True, blank=True, on_delete=models.SET_NULL, related_name='posts',
    )
    show_author = models.BooleanField(default=True, help_text='Show the byline on the article.')
    tags = models.ManyToManyField(Tag, blank=True, related_name='posts')

    # ── SEO ───────────────────────────────────────────────────────────
    # Blank means "derive it", which is why these are filled in save() rather
    # than defaulted: an editor who clears the field gets the auto value back
    # instead of an empty tag.
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    focus_keyword = models.CharField(max_length=80, blank=True)
    canonical_url = models.URLField(blank=True, help_text='Set only when this article also lives elsewhere.')
    noindex = models.BooleanField(default=False, help_text='Ask search engines not to index this article.')

    # ── Publishing ────────────────────────────────────────────────────
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True)
    is_featured = models.BooleanField(default=False, help_text='Shown prominently on the blog listing.')
    comments_enabled = models.BooleanField(default=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # ── Derived / counters ────────────────────────────────────────────
    reading_time = models.PositiveIntegerField(default=1, help_text='Minutes. Recalculated on save.')
    view_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = PostQuerySet.as_manager()

    class Meta:
        db_table = 'blog_post'
        ordering = ('-published_at', '-created_at')
        indexes = [models.Index(fields=['status', 'published_at'])]

    def __str__(self):
        return self.title

    @property
    def takeaway_list(self):
        return [line.strip() for line in self.takeaways.splitlines() if line.strip()]

    @property
    def is_live(self):
        return self.status == self.STATUS_PUBLISHED and bool(
            self.published_at and self.published_at <= timezone.now()
        )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.title)

        # Sanitise on write, not on read. Doing it here means the stored value
        # is already safe, so every consumer — API, Django admin preview, a
        # future RSS feed — gets clean HTML without each having to remember.
        self.content = sanitize_html(self.content)

        # 200 wpm is the usual reading-speed figure for prose on screen.
        words = len(re.findall(r'\S+', strip_tags_for_count(self.content)))
        self.reading_time = max(1, math.ceil(words / 200))

        if not self.meta_title:
            self.meta_title = self.title[:70]
        if not self.meta_description:
            self.meta_description = self.excerpt[:160]
        if not self.image_alt and self.featured_image:
            self.image_alt = self.title[:250]

        # Publishing without a date is the common case — the editor ticks
        # "Published" and expects it live now.
        if self.status == self.STATUS_PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        # A future date means scheduled, whatever the dropdown said. Without
        # this, saving a future date as "Published" would go live immediately.
        if self.published_at and self.published_at > timezone.now() and self.status == self.STATUS_PUBLISHED:
            self.status = self.STATUS_SCHEDULED

        super().save(*args, **kwargs)


class Comment(models.Model):
    """A reader comment, held for moderation by default.

    Auto-publishing reader-submitted HTML on a brand site is not a trade worth
    making, so the default status is `pending` and nothing appears until a
    human approves it. Bodies are stored as plain text and escaped on render —
    no HTML is accepted here at all, unlike post content.
    """

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_SPAM = 'spam'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_SPAM, 'Spam'),
    ]

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies',
    )
    name = models.CharField(max_length=120)
    email = models.EmailField(help_text='Never published. Used only to reach the commenter.')
    body = models.TextField(max_length=4000)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'blog_comment'
        ordering = ('created_at',)

    def __str__(self):
        return f'{self.name} on {self.post.title}'
