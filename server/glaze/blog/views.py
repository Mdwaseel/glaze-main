from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from account.permissions import IsStaff
from account.security import client_ip, record_audit

from .models import Author, Category, Comment, Post, Tag
from .serializers import (
    AdminCommentSerializer,
    AdminPostSerializer,
    AuthorSerializer,
    CategorySerializer,
    CommentCreateSerializer,
    CommentSerializer,
    PostDetailSerializer,
    PostListSerializer,
    TagSerializer,
)


# ═══════════════════════════════════════════════════════════════════
#  Public
# ═══════════════════════════════════════════════════════════════════

class PostPagination(PageNumberPagination):
    page_size = 9  # a 3-column grid divides evenly at every breakpoint
    page_size_query_param = 'page_size'
    max_page_size = 48


class PublicPostListView(APIView):
    """GET /api/v1/blog/posts/

    Filters: ?category=<slug> ?tag=<slug> ?author=<slug> ?search=<text>
             ?featured=true
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        queryset = (
            Post.objects.published()
            .select_related('category', 'author')
            .prefetch_related('tags')
        )

        params = request.query_params
        if params.get('category'):
            queryset = queryset.filter(category__slug=params['category'])
        if params.get('tag'):
            queryset = queryset.filter(tags__slug=params['tag'])
        if params.get('author'):
            queryset = queryset.filter(author__slug=params['author'])
        if params.get('featured') == 'true':
            queryset = queryset.filter(is_featured=True)
        if params.get('search'):
            term = params['search']
            queryset = queryset.filter(
                Q(title__icontains=term)
                | Q(excerpt__icontains=term)
                | Q(content__icontains=term)
                | Q(tags__name__icontains=term)
            )

        # A tag or search join can return the same post once per matching row.
        queryset = queryset.distinct()

        paginator = PostPagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(
            PostListSerializer(page, many=True, context={'request': request}).data
        )


class PublicPostDetailView(APIView):
    """GET /api/v1/blog/posts/<slug>/

    View counting deliberately does NOT happen here. It lives on the analytics
    beacon, which has the session dedupe — counting on every API read would
    inflate the number on each React re-fetch and double it outright under
    StrictMode in development.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        post = (
            Post.objects.published()
            .select_related('category', 'author')
            .prefetch_related('tags')
            .filter(slug=slug)
            .first()
        )
        if post is None:
            return Response({'detail': 'Article not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = PostDetailSerializer(post, context={'request': request}).data

        # Same category first, then anything recent, so a small blog with one
        # category still fills the "read next" rail instead of showing nothing.
        related = (
            Post.objects.published()
            .exclude(pk=post.pk)
            .select_related('category', 'author')
            .order_by('-published_at')
        )
        if post.category_id:
            same = list(related.filter(category_id=post.category_id)[:3])
        else:
            same = []
        if len(same) < 3:
            filler = related.exclude(pk__in=[p.pk for p in same])[: 3 - len(same)]
            same += list(filler)

        data['related'] = PostListSerializer(same, many=True, context={'request': request}).data
        return Response(data)


class PublicTaxonomyView(APIView):
    """GET /api/v1/blog/taxonomy/ — categories, tags and authors in one call.

    One request rather than three because the listing page needs all of them
    at once to render its filter bar, and three round trips would stagger the
    bar into view a piece at a time.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        live = Q(posts__status=Post.STATUS_PUBLISHED)

        categories = Category.objects.annotate(post_count=Count('posts', filter=live))
        authors = (
            Author.objects.filter(is_active=True)
            .annotate(post_count=Count('posts', filter=live))
            .filter(post_count__gt=0)
        )
        tags = Tag.objects.filter(posts__status=Post.STATUS_PUBLISHED).distinct()

        return Response({
            'categories': CategorySerializer(categories, many=True).data,
            'authors': AuthorSerializer(authors, many=True, context={'request': request}).data,
            'tags': TagSerializer(tags, many=True).data,
        })


class PublicCommentView(APIView):
    """GET/POST /api/v1/blog/posts/<slug>/comments/

    GET returns approved comments only. POST stores a new one as `pending` —
    nothing a reader writes appears on the site until a human approves it.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'comment'

    def _post_or_none(self, slug):
        return Post.objects.published().filter(slug=slug).first()

    def get(self, request, slug):
        post = self._post_or_none(slug)
        if post is None:
            return Response({'detail': 'Article not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not post.comments_enabled:
            return Response({'enabled': False, 'results': []})

        approved = post.comments.filter(status=Comment.STATUS_APPROVED)
        return Response({'enabled': True, 'results': CommentSerializer(approved, many=True).data})

    def post(self, request, slug):
        post = self._post_or_none(slug)
        if post is None:
            return Response({'detail': 'Article not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not post.comments_enabled:
            return Response(
                {'detail': 'Comments are closed on this article.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CommentCreateSerializer(data=request.data, context={'post': post})
        serializer.is_valid(raise_exception=True)

        honeypot = serializer.validated_data.pop('website', '')
        comment = Comment(
            post=post, ip_address=client_ip(request), **serializer.validated_data,
        )
        if honeypot:
            comment.status = Comment.STATUS_SPAM
        comment.save()

        return Response(
            {'detail': 'Thank you. Your comment will appear once it has been reviewed.'},
            status=status.HTTP_201_CREATED,
        )


# ═══════════════════════════════════════════════════════════════════
#  Admin
# ═══════════════════════════════════════════════════════════════════

class AdminPostViewSet(viewsets.ModelViewSet):
    """/api/v1/admin/posts/ — full CRUD plus publish / unpublish / duplicate."""

    permission_classes = [IsStaff]
    serializer_class = AdminPostSerializer
    lookup_field = 'pk'
    pagination_class = PostPagination

    def get_queryset(self):
        queryset = (
            Post.objects.all()
            .select_related('category', 'author')
            .prefetch_related('tags')
            .order_by('-updated_at')
        )
        params = self.request.query_params
        if params.get('status'):
            queryset = queryset.filter(status=params['status'])
        if params.get('category'):
            queryset = queryset.filter(category__slug=params['category'])
        if params.get('search'):
            queryset = queryset.filter(
                Q(title__icontains=params['search']) | Q(excerpt__icontains=params['search'])
            )
        return queryset

    def perform_create(self, serializer):
        post = serializer.save()
        record_audit(self.request, 'post.create', target=post.slug, title=post.title)

    def perform_update(self, serializer):
        post = serializer.save()
        record_audit(self.request, 'post.update', target=post.slug, status=post.status)

    def perform_destroy(self, instance):
        record_audit(self.request, 'post.delete', target=instance.slug, title=instance.title)
        instance.delete()

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        post = self.get_object()
        post.status = Post.STATUS_PUBLISHED
        # Leaves an existing published_at alone so re-publishing an archived
        # post keeps its original date and does not jump to the top of the feed.
        post.save()
        record_audit(request, 'post.publish', target=post.slug)
        return Response(self.get_serializer(post).data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        post = self.get_object()
        post.status = Post.STATUS_DRAFT
        post.save()
        record_audit(request, 'post.unpublish', target=post.slug)
        return Response(self.get_serializer(post).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        original = self.get_object()
        tags = list(original.tags.all())

        original.pk = None
        original.id = None
        original.slug = ''          # regenerated in save()
        original.title = f'{original.title} (copy)'[:200]
        original.status = Post.STATUS_DRAFT
        original.published_at = None
        original.is_featured = False   # two featured articles from one click is never the intent
        original.view_count = 0
        original.save()
        original.tags.set(tags)

        record_audit(request, 'post.duplicate', target=original.slug)
        return Response(self.get_serializer(original).data, status=status.HTTP_201_CREATED)


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaff]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(post_count=Count('posts'))

    def perform_create(self, serializer):
        obj = serializer.save()
        record_audit(self.request, 'category.create', target=obj.slug)

    def perform_update(self, serializer):
        obj = serializer.save()
        record_audit(self.request, 'category.update', target=obj.slug)

    def perform_destroy(self, instance):
        # Post.category is SET_NULL, so deleting a category never deletes the
        # articles filed under it — they simply become uncategorised.
        record_audit(self.request, 'category.delete', target=instance.slug)
        instance.delete()


class AdminAuthorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaff]
    serializer_class = AuthorSerializer
    pagination_class = None

    def get_queryset(self):
        return Author.objects.annotate(post_count=Count('posts'))

    def perform_create(self, serializer):
        obj = serializer.save()
        record_audit(self.request, 'author.create', target=obj.slug)

    def perform_update(self, serializer):
        obj = serializer.save()
        record_audit(self.request, 'author.update', target=obj.slug)

    def perform_destroy(self, instance):
        record_audit(self.request, 'author.delete', target=instance.slug)
        instance.delete()


class AdminTagViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaff]
    serializer_class = TagSerializer
    queryset = Tag.objects.all()
    pagination_class = None


class AdminCommentViewSet(viewsets.ModelViewSet):
    """Moderation queue. Only `status` is writable — see AdminCommentSerializer."""

    permission_classes = [IsStaff]
    serializer_class = AdminCommentSerializer
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        queryset = Comment.objects.select_related('post').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_update(self, serializer):
        comment = serializer.save()
        record_audit(self.request, 'comment.moderate', target=str(comment.pk), status=comment.status)

    def perform_destroy(self, instance):
        record_audit(self.request, 'comment.delete', target=str(instance.pk))
        instance.delete()


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([])
def slug_available(request):
    """GET /api/v1/blog/slug-check/?slug=…&exclude=<pk>

    Lets the editor warn about a clash before the author has written the whole
    article, rather than surfacing it as a validation error on save.
    """
    slug = (request.query_params.get('slug') or '').strip()
    if not slug:
        return Response({'available': False, 'detail': 'A slug is required.'})

    queryset = Post.objects.filter(slug=slug)
    exclude = request.query_params.get('exclude')
    if exclude:
        queryset = queryset.exclude(pk=exclude)

    return Response({'available': not queryset.exists()})
