from django.contrib import admin

from .models import DailyStat, PageView


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'path', 'device', 'duration_ms')
    list_filter = ('device', 'created_at')
    search_fields = ('path', 'title', 'referrer')
    date_hierarchy = 'created_at'

    # Measurements, not records. Editing one would corrupt the reports it feeds.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(DailyStat)
class DailyStatAdmin(admin.ModelAdmin):
    list_display = ('date', 'path', 'views', 'unique_visitors', 'avg_duration_ms')
    list_filter = ('date',)
    search_fields = ('path',)

    def has_add_permission(self, request):
        return False
