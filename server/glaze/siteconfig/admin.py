from django.contrib import admin

from .models import ContactSettings, Enquiry, SiteSettings


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


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'name', 'email', 'category', 'system', 'status', 'notified_at')
    list_filter = ('status', 'category', 'system', 'created_at')
    search_fields = ('name', 'email', 'phone', 'message')
    date_hierarchy = 'created_at'
    # Everything the visitor sent is evidence; only the workflow status moves.
    readonly_fields = (
        'name', 'email', 'phone', 'enquiry_type', 'system', 'variant', 'message',
        'source_path', 'category', 'ip_address', 'notified_at', 'auto_replied_at',
        'created_at',
    )

    def has_add_permission(self, request):
        return False
