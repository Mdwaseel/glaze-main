"""Django-admin registration for the catalogue.

The React Studio at /admin/systems is where this is meant to be edited — it
knows what a stat row or a spec pair is and renders repeatable fields for
them. This registration exists for the same reason every other model here has
one: raw access when something needs unpicking, and a place to look at a row
without going through the panel.
"""

from django.contrib import admin

from .models import System, Variant


class VariantInline(admin.TabularInline):
    model = Variant
    extra = 0
    fields = ('order', 'key', 'name', 'kind', 'is_published')
    ordering = ('order',)
    show_change_link = True


@admin.register(System)
class SystemAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'order', 'is_published', 'updated_at')
    list_filter = ('is_published',)
    search_fields = ('name', 'slug')
    ordering = ('order',)
    prepopulated_fields = {'slug': ('name',)}
    inlines = [VariantInline]


@admin.register(Variant)
class VariantAdmin(admin.ModelAdmin):
    list_display = ('name', 'system', 'key', 'order', 'is_published', 'updated_at')
    list_filter = ('system', 'is_published')
    search_fields = ('name', 'key')
    ordering = ('system', 'order')
