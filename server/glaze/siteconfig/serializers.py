from rest_framework import serializers

from .models import ContactSettings, Enquiry, SiteSettings


class PublicSiteSettingsSerializer(serializers.ModelSerializer):
    """What any anonymous visitor may see.

    An explicit allowlist, not `exclude`. With exclude, adding an internal
    field to the model later would silently publish it; here a new field is
    private until someone deliberately names it.
    """

    whatsapp_link = serializers.CharField(read_only=True)
    default_og_image = serializers.ImageField(read_only=True)

    class Meta:
        model = SiteSettings
        fields = (
            'site_name', 'tagline',
            'contact_email', 'contact_phone', 'contact_phone_secondary',
            'address', 'map_url', 'business_hours',
            'whatsapp_enabled', 'whatsapp_number', 'whatsapp_label', 'whatsapp_link',
            'instagram_url', 'facebook_url', 'linkedin_url', 'youtube_url',
            'system_page_layout',
            'meta_title_suffix', 'default_meta_description', 'default_og_image',
            'latitude', 'longitude',
            # Tracking ids and verification tokens are PUBLIC by nature: every
            # one of them ends up in the page's own HTML where anybody can read
            # it. Serving them here rather than baking them into the bundle is
            # what makes them editable without a deploy.
            'ga_measurement_id', 'gtm_container_id',
            'meta_pixel_id', 'meta_pixel_track_enquiries',
            'google_site_verification', 'bing_site_verification',
            'facebook_domain_verification',
            'maintenance_mode', 'maintenance_message',
        )
        read_only_fields = fields


class AdminSiteSettingsSerializer(serializers.ModelSerializer):
    whatsapp_link = serializers.CharField(read_only=True)

    class Meta:
        model = SiteSettings
        exclude = ('id',)
        read_only_fields = ('updated_at',)


class ContactSettingsSerializer(serializers.ModelSerializer):
    recipient_count = serializers.SerializerMethodField()
    # Who each enquiry type ACTUALLY reaches once the fallback is applied.
    # Computed here rather than in the panel because the fallback rule is a
    # server rule, and a UI that re-implemented it would eventually disagree
    # with the code that sends the mail.
    routing = serializers.SerializerMethodField()

    class Meta:
        model = ContactSettings
        exclude = ('id',)
        read_only_fields = ('updated_at',)

    def get_recipient_count(self, obj):
        return len(obj.recipient_list)

    def get_routing(self, obj):
        default = obj.recipient_list
        rows = []
        for value, label in Enquiry.CATEGORY_CHOICES:
            recipients = obj.recipients_for(value)
            rows.append({
                'category': value,
                'label': label,
                'recipients': recipients,
                'using_default': recipients == default,
            })
        return rows

    def _validate_list(self, value, required):
        # Reuse the model validators so the API and the Django admin reject the
        # same input — a rule enforced in only one of the two is a rule that
        # eventually gets bypassed.
        from django.core.exceptions import ValidationError as DjangoValidationError
        from .models import validate_email_list, validate_optional_email_list
        try:
            (validate_email_list if required else validate_optional_email_list)(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate_recipient_emails(self, value):
        return self._validate_list(value, required=True)

    def validate_contact_recipient_emails(self, value):
        return self._validate_list(value, required=False)

    def validate_product_recipient_emails(self, value):
        return self._validate_list(value, required=False)

    def validate_general_recipient_emails(self, value):
        return self._validate_list(value, required=False)


class EnquirySerializer(serializers.ModelSerializer):
    """Public submission shape.

    `website` is a honeypot: a field hidden from people by CSS that a naive
    bot fills in because it fills everything. Non-empty means "not a human",
    and the view records the row as spam without emailing anyone. It is not
    strong protection on its own — it is one free filter that costs a real
    visitor nothing, unlike a captcha on a public contact form.
    """

    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Enquiry
        fields = (
            'id', 'name', 'email', 'phone', 'enquiry_type', 'system', 'systems',
            'variant', 'message', 'country', 'city', 'state', 'openings', 'timeline',
            'budget', 'contact_method', 'contact_time',
            'source_path', 'website', 'created_at',
        )
        read_only_fields = ('id', 'created_at')

    def validate(self, attrs):
        if not attrs.get('email') and not attrs.get('phone'):
            raise serializers.ValidationError(
                {'email': 'Provide an email address or a phone number so we can reply.'}
            )
        return attrs


class AdminEnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Enquiry
        fields = '__all__'
        read_only_fields = tuple(
            field for field in (
                'id', 'name', 'email', 'phone', 'enquiry_type', 'system', 'variant',
                'message', 'source_path', 'category', 'ip_address', 'notified_at',
                'auto_replied_at', 'created_at',
            )
        )
