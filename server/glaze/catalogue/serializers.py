"""Catalogue serialisers — one public shape, one admin shape.

They are deliberately different shapes rather than one with fields hidden:

  PUBLIC  nested by section (hero, overview, card, teaser) and carrying
          RESOLVED media urls only. It is the payload the React app renders,
          so it mirrors the structure of the modules it replaces
          (client/src/data/systems.js) and nothing that reads it needs to know
          an upload from a path.

  ADMIN   flat, with both halves of every media pair writable and the
          unpublished rows included. It is the payload an editor's form binds
          to, so it has to be able to say "clear this upload and use the path
          instead", which the resolved url cannot express.
"""

import json

from rest_framework import serializers

from .models import System, Variant


# ── Public ────────────────────────────────────────────────────────────

class PublicVariantSerializer(serializers.ModelSerializer):
    video = serializers.CharField(source='video_url', read_only=True)
    poster = serializers.CharField(source='poster_url', read_only=True)

    class Meta:
        model = Variant
        fields = ('key', 'name', 'kind', 'lede', 'specs', 'video', 'poster')


class PublicSystemSerializer(serializers.ModelSerializer):
    hero = serializers.SerializerMethodField()
    overview = serializers.SerializerMethodField()
    card = serializers.SerializerMethodField()
    teaser = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()

    class Meta:
        model = System
        fields = (
            'slug', 'name', 'page_title', 'meta_description',
            'schema_name', 'schema_category', 'schema_description',
            'hero', 'overview', 'series_note', 'fits', 'series_order',
            'card', 'teaser', 'enquiry_note', 'variants',
        )

    def get_hero(self, obj):
        return {
            'video': obj.hero_video_url,
            'image': obj.hero_image_url,
            'title': obj.hero_title,
            'accent': obj.hero_accent,
            'lede': obj.hero_lede,
        }

    def get_overview(self, obj):
        return {
            'title_lead': obj.overview_title_lead,
            'title_em': obj.overview_title_em,
            'chips': obj.chips,
            'body': obj.overview_body,
            'stats': obj.stats,
            'strengths': obj.strengths,
        }

    def get_card(self, obj):
        return {
            'video': obj.card_video_url,
            'poster': obj.card_poster_url,
            'image': obj.card_image_url,
        }

    def get_teaser(self, obj):
        return {
            'lead': obj.teaser_lead,
            'em': obj.teaser_em,
            'desc': obj.teaser_desc,
            'specs': obj.teaser_specs,
            'cta': obj.teaser_cta,
        }

    def get_variants(self, obj):
        # Prefetched by the view. Filtering in Python rather than with a
        # second query keeps this one query for the whole catalogue.
        published = [v for v in obj.variants.all() if v.is_published]
        return PublicVariantSerializer(published, many=True).data


# ── Admin ─────────────────────────────────────────────────────────────

class JSONFieldsFromFormMixin:
    """Let JSON fields survive a multipart request.

    An admin form posts JSON while it is only text, and multipart the moment
    it carries a file — and multipart has no types, so `stats` arrives as the
    STRING '[{"to":"300",…}]' and DRF's JSONField rejects it (or, worse,
    stores the string). This parses those fields back before validation.

    Only fields listed in `json_fields` are touched, so a genuine string that
    happens to start with '[' in some other field is never reinterpreted.
    """

    json_fields = ()

    def to_internal_value(self, data):
        if hasattr(data, 'getlist'):  # QueryDict — i.e. form or multipart
            data = data.dict()
            for field in self.json_fields:
                raw = data.get(field)
                if isinstance(raw, str):
                    try:
                        data[field] = json.loads(raw)
                    except ValueError:
                        pass  # let the field's own validation report it
        return super().to_internal_value(data)


class AdminVariantSerializer(JSONFieldsFromFormMixin, serializers.ModelSerializer):
    json_fields = ('specs',)

    video_url = serializers.CharField(read_only=True)
    poster_url = serializers.CharField(read_only=True)
    system_slug = serializers.CharField(source='system.slug', read_only=True)

    class Meta:
        model = Variant
        fields = (
            'id', 'system', 'system_slug', 'key', 'name', 'kind', 'lede', 'specs',
            'video', 'video_file', 'poster', 'poster_file',
            'video_url', 'poster_url', 'order', 'is_published', 'updated_at',
        )
        read_only_fields = ('id', 'system', 'updated_at')

    def validate_specs(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Specifications must be a list of rows.')
        for row in value:
            if not isinstance(row, dict) or 'k' not in row or 'v' not in row:
                raise serializers.ValidationError(
                    'Each specification row needs a label (k) and a value (v).',
                )
        return value

    def validate(self, attrs):
        """One `key` per system, checked here rather than only in the database.

        The unique constraint would raise a 500-shaped IntegrityError; this
        returns a field error the form can put under the input.
        """
        key = attrs.get('key', getattr(self.instance, 'key', None))
        system = self.context.get('system') or getattr(self.instance, 'system', None)
        if key and system:
            clash = Variant.objects.filter(system=system, key=key)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError(
                    {'key': f'“{key}” is already used by another {system.name} variant.'},
                )
        return attrs


class AdminSystemSerializer(JSONFieldsFromFormMixin, serializers.ModelSerializer):
    json_fields = (
        'chips', 'overview_body', 'stats', 'strengths',
        'fits', 'series_order', 'teaser_specs',
    )

    variants = AdminVariantSerializer(many=True, read_only=True)
    variant_count = serializers.SerializerMethodField()
    hero_video_url = serializers.CharField(read_only=True)
    hero_image_url = serializers.CharField(read_only=True)
    card_video_url = serializers.CharField(read_only=True)
    card_poster_url = serializers.CharField(read_only=True)
    card_image_url = serializers.CharField(read_only=True)

    class Meta:
        model = System
        fields = (
            'id', 'slug', 'name', 'order', 'is_published',
            'page_title', 'meta_description',
            'schema_name', 'schema_category', 'schema_description',
            'hero_video', 'hero_video_file', 'hero_image', 'hero_image_file',
            'hero_title', 'hero_accent', 'hero_lede',
            'overview_title_lead', 'overview_title_em', 'chips', 'overview_body',
            'stats', 'strengths',
            'series_note', 'fits', 'series_order',
            'card_video', 'card_video_file', 'card_poster', 'card_poster_file',
            'card_image', 'card_image_file',
            'teaser_lead', 'teaser_em', 'teaser_desc', 'teaser_specs', 'teaser_cta',
            'enquiry_note',
            'hero_video_url', 'hero_image_url',
            'card_video_url', 'card_poster_url', 'card_image_url',
            'variants', 'variant_count', 'updated_at',
        )
        read_only_fields = ('id', 'updated_at')

    def get_variant_count(self, obj):
        # len() over the prefetched list, not .count() — .count() is a fresh
        # query per row, which is a list of seven systems costing eight.
        return len(obj.variants.all())

    def validate_stats(self, value):
        for row in value or []:
            if not isinstance(row, dict) or 'to' not in row or 'key' not in row:
                raise serializers.ValidationError(
                    'Each statistic needs at least a figure (to) and a label (key).',
                )
        return value

    def validate_strengths(self, value):
        for row in value or []:
            if not isinstance(row, dict) or not row.get('title'):
                raise serializers.ValidationError('Each strength needs a title.')
        return value


class AdminSystemListSerializer(serializers.ModelSerializer):
    """The list screen — enough to render a row, not the whole record."""

    variant_count = serializers.SerializerMethodField()
    card_poster_url = serializers.CharField(read_only=True)
    card_image_url = serializers.CharField(read_only=True)

    class Meta:
        model = System
        fields = (
            'id', 'slug', 'name', 'order', 'is_published', 'variant_count',
            'card_poster_url', 'card_image_url', 'updated_at',
        )

    def get_variant_count(self, obj):
        # len() over the prefetched list, not .count() — .count() is a fresh
        # query per row, which is a list of seven systems costing eight.
        return len(obj.variants.all())
