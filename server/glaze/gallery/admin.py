"""Django-admin registration for the gallery.

The React Studio at /admin/gallery is where this is meant to be edited — it
shows the tiles as tiles and lets them be reordered by dragging. This exists
for the same reason every other model's registration does: raw access when
something needs unpicking, and somewhere to look at a row without the panel.

⚠ `readonly_fields` CARRIES THE RESOLVED URLS. The two halves of each media
pair are both editable above them; these show which one actually won, which
is the question anybody opening this screen is here to answer.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import GalleryCategory, GalleryItem


@admin.register(GalleryCategory)
class GalleryCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'order', 'is_published', 'item_count')
    list_filter = ('is_published',)
    search_fields = ('name', 'slug')
    ordering = ('order', 'name')
    prepopulated_fields = {'slug': ('name',)}

    @admin.display(description='Items')
    def item_count(self, obj):
        return obj.items.count()


@admin.register(GalleryItem)
class GalleryItemAdmin(admin.ModelAdmin):
    list_display = ('thumb', 'title', 'kind', 'category', 'system', 'order',
                    'is_featured', 'is_published', 'updated_at')
    list_display_links = ('thumb', 'title')
    list_filter = ('kind', 'category', 'is_published', 'is_featured')
    list_editable = ('order', 'is_featured', 'is_published')
    search_fields = ('title', 'caption', 'alt_text')
    ordering = ('order', '-created_at')
    autocomplete_fields = ('system',)
    readonly_fields = ('image_url', 'video_url', 'poster_url', 'created_at', 'updated_at')

    fieldsets = (
        (None, {
            'fields': ('kind', 'title', 'caption', 'alt_text'),
        }),
        ('Placement', {
            'fields': ('category', 'system', 'order', 'is_featured', 'is_published', 'shot_on'),
        }),
        ('Media — an upload wins over a path', {
            'fields': (
                ('image', 'image_file'),
                ('video', 'video_file'),
                ('poster', 'poster_file'),
                ('image_url', 'video_url', 'poster_url'),
            ),
        }),
        ('Timestamps', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at'),
        }),
    )

    @admin.display(description='')
    def thumb(self, obj):
        """A 64px still in the changelist. A gallery admin that lists titles
        without pictures is a spreadsheet of a thing whose entire content is
        the picture."""
        src = obj.poster_url or obj.image_url
        if not src:
            return '—'
        return format_html(
            '<img src="{}" style="width:64px;height:44px;object-fit:cover;'
            'border-radius:2px;display:block" alt="" />',
            src,
        )
