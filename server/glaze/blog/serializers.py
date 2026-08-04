from django.conf import settings
from rest_framework import serializers

from .models import Author, Category, Comment, Post, Tag


class CategorySerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description', 'accent_color', 'order', 'post_count')
        read_only_fields = ('id', 'slug', 'post_count')


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name', 'slug')
        read_only_fields = ('id', 'slug')


class AuthorSerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Author
        fields = (
            'id', 'name', 'slug', 'role', 'bio', 'avatar', 'email',
            'linkedin_url', 'is_active', 'post_count',
        )
        read_only_fields = ('id', 'slug', 'post_count')


class PublicAuthorSerializer(serializers.ModelSerializer):
    """Byline only. `email` is deliberately absent — it is internal contact
    detail, and publishing it on every article is a spam magnet."""

    class Meta:
        model = Author
        fields = ('name', 'slug', 'role', 'bio', 'avatar', 'linkedin_url')


class PostListSerializer(serializers.ModelSerializer):
    """Card shape for the listing. Excludes `content`, which is the bulk of a
    post — sending twelve full articles to render twelve cards would multiply
    the payload for nothing."""

    category = CategorySerializer(read_only=True)
    author = PublicAuthorSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = (
            'id', 'title', 'slug', 'excerpt', 'featured_image', 'image_alt',
            'category', 'author', 'show_author', 'tags', 'is_featured',
            'reading_time', 'view_count', 'published_at',
        )


class PostDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    author = PublicAuthorSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    takeaway_list = serializers.ListField(read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = (
            'id', 'title', 'slug', 'excerpt', 'content', 'takeaway_list',
            'featured_image', 'image_alt',
            'category', 'author', 'show_author', 'tags',
            'meta_title', 'meta_description', 'focus_keyword', 'canonical_url', 'noindex',
            'is_featured', 'comments_enabled', 'reading_time', 'view_count',
            'published_at', 'updated_at', 'comment_count',
        )

    def get_comment_count(self, obj):
        return obj.comments.filter(status=Comment.STATUS_APPROVED).count()


class AdminPostSerializer(serializers.ModelSerializer):
    """Editor shape: every field writable, related objects by id.

    `tag_names` takes free text so the editor's tag input can create tags on
    the fly, which is how every blog CMS behaves — making an editor visit a
    separate screen to register a tag before using it is friction with no
    payoff.
    """

    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=60), write_only=True, required=False,
    )
    tags = TagSerializer(many=True, read_only=True)
    category_detail = CategorySerializer(source='category', read_only=True)
    author_detail = AuthorSerializer(source='author', read_only=True)
    takeaway_list = serializers.ListField(read_only=True)
    is_live = serializers.BooleanField(read_only=True)

    class Meta:
        model = Post
        fields = '__all__'
        read_only_fields = ('id', 'slug', 'reading_time', 'view_count', 'created_at', 'updated_at')

    def validate_featured_image(self, image):
        if image and image.size > settings.MAX_UPLOAD_SIZE_BYTES:
            limit = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise serializers.ValidationError(f'Image must be under {limit} MB.')
        return image

    def _apply_tags(self, post, tag_names):
        tags = []
        for raw in tag_names:
            name = raw.strip()
            if not name:
                continue
            # get_or_create on a case-insensitive lookup, so "Glazing" typed
            # twice with different capitalisation stays one tag.
            tag = Tag.objects.filter(name__iexact=name).first()
            if tag is None:
                tag = Tag.objects.create(name=name)
            tags.append(tag)
        post.tags.set(tags)

    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', None)
        post = super().create(validated_data)
        if tag_names is not None:
            self._apply_tags(post, tag_names)
        return post

    def update(self, instance, validated_data):
        tag_names = validated_data.pop('tag_names', None)
        post = super().update(instance, validated_data)
        # None means "not sent" (a PATCH that touched other fields); an empty
        # list means "clear the tags". Conflating the two would wipe tags on
        # every partial save.
        if tag_names is not None:
            self._apply_tags(post, tag_names)
        return post


class CommentSerializer(serializers.ModelSerializer):
    """Public read shape. `email` is never exposed."""

    class Meta:
        model = Comment
        fields = ('id', 'name', 'body', 'parent', 'created_at')


class CommentCreateSerializer(serializers.ModelSerializer):
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Comment
        fields = ('name', 'email', 'body', 'parent', 'website')

    def validate_parent(self, parent):
        # A reply must belong to the same article, or a crafted parent id would
        # graft a comment thread from one post onto another.
        post = self.context.get('post')
        if parent and post and parent.post_id != post.id:
            raise serializers.ValidationError('That comment belongs to a different article.')
        return parent


class AdminCommentSerializer(serializers.ModelSerializer):
    post_title = serializers.CharField(source='post.title', read_only=True)
    post_slug = serializers.CharField(source='post.slug', read_only=True)

    class Meta:
        model = Comment
        fields = (
            'id', 'post', 'post_title', 'post_slug', 'parent', 'name', 'email',
            'body', 'status', 'ip_address', 'created_at',
        )
        read_only_fields = (
            'id', 'post', 'post_title', 'post_slug', 'parent', 'name', 'email',
            'body', 'ip_address', 'created_at',
        )
