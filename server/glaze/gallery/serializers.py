"""Gallery serialisers — one public shape, one admin shape.

Same split as catalogue/serializers.py and for the same reason:

  PUBLIC  resolved media urls only, published rows only, and the alt text
          already defaulted. It is what the grid renders, and nothing that
          reads it needs to know an upload from a path.

  ADMIN   flat, with both halves of every media pair writable and unpublished
          rows included, because an editor's form has to be able to say
          "clear this upload and use the path instead" — which a resolved url
          cannot express.
"""

from rest_framework import serializers

from .models import GalleryCategory, GalleryItem


# ── Public ────────────────────────────────────────────────────────────

class PublicCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryCategory
        fields = ('slug', 'name')


class PublicItemSerializer(serializers.ModelSerializer):
    image = serializers.CharField(source='image_url', read_only=True)
    video = serializers.CharField(source='video_url', read_only=True)
    poster = serializers.CharField(source='poster_url', read_only=True)
    category = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    system = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    alt = serializers.SerializerMethodField()

    class Meta:
        model = GalleryItem
        fields = (
            'id', 'kind', 'title', 'caption', 'alt',
            'category', 'system', 'image', 'video', 'poster', 'is_featured',
        )

    def get_alt(self, obj):
        """⚠ NEVER EMPTY. `alt_text` is optional for the editor because most
        titles already describe the picture; defaulting here rather than in
        the component means every consumer of this API gets a description,
        and an item can never reach the page as an unlabelled image."""
        return obj.alt_text or obj.title


# ── Admin ─────────────────────────────────────────────────────────────

class AdminCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = GalleryCategory
        fields = ('id', 'name', 'slug', 'order', 'is_published', 'item_count', 'updated_at')
        read_only_fields = ('updated_at',)

    def get_item_count(self, obj):
        """Annotated by the view where the list is fetched; falls back to a
        query so the serialiser is still correct when used on its own."""
        cached = getattr(obj, 'item_count_annotated', None)
        return cached if cached is not None else obj.items.count()


class AdminItemSerializer(serializers.ModelSerializer):
    # Resolved alongside the writable pair, so the editor can show a preview
    # of what the site will actually render without recomputing the
    # upload-beats-path rule in JavaScript.
    image_url = serializers.CharField(read_only=True)
    video_url = serializers.CharField(read_only=True)
    poster_url = serializers.CharField(read_only=True)

    class Meta:
        model = GalleryItem
        fields = (
            'id', 'kind', 'title', 'caption', 'alt_text',
            'category', 'system',
            'image', 'image_file', 'video', 'video_file', 'poster', 'poster_file',
            'image_url', 'video_url', 'poster_url',
            'is_featured', 'order', 'is_published', 'shot_on',
            'updated_at', 'created_at',
        )
        read_only_fields = ('updated_at', 'created_at')

    def validate(self, attrs):
        """An item with no media is an empty tile, and the grid cannot render it.

        The same rule as `GalleryItem.clean()`, which is what the Django admin
        enforces — stated here too so the Studio and the admin reject the same
        rows rather than the API accepting one the admin would refuse.

        ⚠ IT RESOLVES AGAINST THE ROW AS IT WILL BE, not as it was. A PATCH
        that only clears `image_file` has to be judged on whether `image` is
        still set on the existing row; validating the incoming fields alone
        would let an editor blank the last piece of media on an item and get a
        200 back for it.
        """
        def resolved(field):
            if field in attrs:
                return attrs[field]
            return getattr(self.instance, field, None)

        kind = resolved('kind') or GalleryItem.IMAGE
        if kind == GalleryItem.VIDEO:
            if not (resolved('video') or resolved('video_file')):
                raise serializers.ValidationError(
                    {'video': 'A film needs a video file or a path.'}
                )
        elif not (resolved('image') or resolved('image_file')):
            raise serializers.ValidationError(
                {'image': 'A photograph needs an image file or a path.'}
            )
        return attrs
