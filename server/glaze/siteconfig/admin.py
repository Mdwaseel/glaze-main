from django.contrib import admin
from django.utils.html import format_html

from .models import ContactSettings, Enquiry, EnquiryAttachment, SiteSettings


class SingletonAdmin(admin.ModelAdmin):
    """One row, so the changelist is a detour — but Django needs it to exist.

    Add is closed (the row is created by .load()) and delete is closed (the
    site reads this row on every request).
    """

    def has_add_permission(self, request):
        return not self.model.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SiteSettings)
class SiteSettingsAdmin(SingletonAdmin):
    fieldsets = (
        ('Identity', {'fields': ('site_name', 'tagline')}),
        ('Contact information', {
            'fields': ('contact_email', 'contact_phone', 'contact_phone_secondary',
                       'address', 'map_url', 'business_hours'),
            'description': 'Shown in the header, footer and contact sections.',
        }),
        ('WhatsApp', {'fields': ('whatsapp_enabled', 'whatsapp_number', 'whatsapp_label')}),
        ('Social', {'fields': ('instagram_url', 'facebook_url', 'linkedin_url', 'youtube_url')}),
        ('Presentation', {'fields': ('system_page_layout',)}),
        ('Location (LocalBusiness schema)', {'fields': ('latitude', 'longitude')}),
        ('Analytics, ads & verification', {
            'fields': ('ga_measurement_id', 'gtm_container_id',
                       'meta_pixel_id', 'meta_pixel_track_enquiries',
                       'google_site_verification', 'bing_site_verification',
                       'facebook_domain_verification'),
            'description': 'Edited in the React panel at Studio > Site settings; here for '
                           'raw access. Blank injects nothing.',
        }),
        # ga_measurement_id moved up into the analytics group — it was listed
        # here as well, which Django rejects outright as a duplicate field.
        ('SEO', {'fields': ('meta_title_suffix', 'default_meta_description',
                            'default_og_image')}),
        ('Maintenance', {'fields': ('maintenance_mode', 'maintenance_message')}),
    )
    readonly_fields = ('updated_at',)


@admin.register(ContactSettings)
class ContactSettingsAdmin(SingletonAdmin):
    fieldsets = (
        ('Recipient emails', {
            'fields': ('recipient_emails', 'subject_prefix',
                       'subject_include_category', 'notify_enabled'),
            'description': 'The default list — used by any enquiry type without one of its own.',
        }),
        ('Routing by enquiry type', {
            'fields': ('contact_recipient_emails', 'product_recipient_emails',
                       'general_recipient_emails'),
            'description': 'Optional. Each falls back to the default list when left blank, '
                           'so an enquiry can never reach nobody.',
        }),
        ('Customer auto-reply', {
            'fields': ('auto_reply_enabled', 'auto_reply_subject', 'auto_reply_html'),
            'description': 'Only sent when the visitor provided an email address.',
        }),
    )
    readonly_fields = ('updated_at',)


class EnquiryAttachmentInline(admin.TabularInline):
    """The drawings, on the enquiry they belong to.

    Inline rather than its own changelist: an attachment has no meaning apart
    from its enquiry, and the person opening a lead wants the plans in front
    of them, not a second page to go and find.
    """

    model = EnquiryAttachment
    extra = 0
    can_delete = False
    fields = ('download', 'original_name', 'pretty_size', 'content_type', 'uploaded_at')
    readonly_fields = ('download', 'original_name', 'pretty_size', 'content_type', 'uploaded_at')

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description='File')
    def download(self, obj):
        """⚠ `download` FORCES A SAVE DIALOG RATHER THAN A RENDER, which is
        the point. These are visitor-uploaded files served from our own
        origin; a PDF opened inline runs in that origin's context. Nothing
        here should ever be displayed by the browser."""
        if not obj.file:
            return '—'
        return format_html(
            '<a href="{}" download target="_blank" rel="noopener noreferrer">Download</a>',
            obj.file.url,
        )

    @admin.display(description='Size')
    def pretty_size(self, obj):
        if not obj.size:
            return '—'
        return f'{obj.size / 1024:.0f} KB' if obj.size < 1024 * 1024 else f'{obj.size / 1048576:.1f} MB'


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = (
        'created_at', 'name', 'email', 'category', 'system', 'budget',
        'attachment_count', 'status', 'notified_at',
    )
    # Budget and timeline are filters now rather than substrings of a
    # paragraph — the whole reason they became columns.
    list_filter = ('status', 'category', 'country', 'system', 'budget', 'timeline', 'created_at')
    search_fields = ('name', 'email', 'phone', 'message', 'city', 'state', 'country')
    date_hierarchy = 'created_at'
    inlines = (EnquiryAttachmentInline,)
    # Everything the visitor sent is evidence; only the workflow status moves.
    readonly_fields = (
        'name', 'email', 'phone', 'enquiry_type', 'system', 'systems', 'variant',
        'message', 'country', 'city', 'state', 'openings', 'timeline', 'budget',
        'contact_method', 'contact_time',
        'source_path', 'category', 'ip_address', 'notified_at', 'auto_replied_at',
        'created_at',
    )

    def get_queryset(self, request):
        # The count column would otherwise fire one query per row.
        return super().get_queryset(request).prefetch_related('attachments')

    @admin.display(description='Files')
    def attachment_count(self, obj):
        n = len(obj.attachments.all())
        return n or '—'

    def has_add_permission(self, request):
        return False
