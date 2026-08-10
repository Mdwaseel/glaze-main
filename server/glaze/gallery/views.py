"""Gallery endpoints.

One public read for the whole gallery, and CRUD behind IsStaff — the same
shape as catalogue/views.py, and for the same reason: the page wants the set,
not a page of it. A gallery is browsed by filtering an already-loaded grid,
so paginating the public read would mean a network round trip every time
somebody taps a filter tab.

⚠ THERE IS A CEILING ON THAT. `PUBLIC_LIMIT` caps the public response, because
"fetch everything" is only reasonable while everything is a few dozen rows,
and this is the one table on the site that grows every time somebody visits a
finished project with a camera. The cap is deliberately visible rather than
silent — the response carries `total`, so the client can say "showing 120 of
340" instead of quietly pretending 120 is all of it.
"""

from django.db.models import Count
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from account.permissions import IsStaff
from account.security import record_audit

from .models import GalleryCategory, GalleryItem
from .serializers import (
    AdminCategorySerializer,
    AdminItemSerializer,
    PublicCategorySerializer,
    PublicItemSerializer,
)

PUBLIC_LIMIT = 120


class PublicGalleryView(APIView):
    """GET /api/v1/gallery/ — published categories and items, in grid order."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        items = (
            GalleryItem.objects.filter(is_published=True)
            # The two foreign keys are serialised as slugs, so without this
            # a 120-tile response is 241 queries.
            .select_related('category', 'system')
        )
        total = items.count()

        categories = GalleryCategory.objects.filter(is_published=True)

        return Response({
            'categories': PublicCategorySerializer(categories, many=True).data,
            'items': PublicItemSerializer(items[:PUBLIC_LIMIT], many=True).data,
            'total': total,
            'limit': PUBLIC_LIMIT,
        })


# ── Admin: items ──────────────────────────────────────────────────────

class AdminGalleryItemListView(APIView):
    """GET/POST /api/v1/admin/gallery/items/

    Unpaginated, like the catalogue's list: the Studio's grid is a
    drag-to-reorder surface and a page control over it would mean an item can
    only be moved within its own page.
    """

    permission_classes = [IsStaff]

    def get(self, request):
        items = GalleryItem.objects.select_related('category', 'system')
        return Response(AdminItemSerializer(items, many=True).data)

    def post(self, request):
        serializer = AdminItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        record_audit(request, 'gallery.item.create', target=str(item.pk))
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminGalleryItemDetailView(APIView):
    """GET/PATCH/DELETE /api/v1/admin/gallery/items/<pk>/"""

    permission_classes = [IsStaff]

    def get_object(self, pk):
        return GalleryItem.objects.filter(pk=pk).select_related('category', 'system').first()

    def get(self, request, pk):
        item = self.get_object(pk)
        if not item:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(AdminItemSerializer(item).data)

    def patch(self, request, pk):
        item = self.get_object(pk)
        if not item:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = AdminItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit(request, 'gallery.item.update', target=str(item.pk))
        return Response(serializer.data)

    def delete(self, request, pk):
        item = self.get_object(pk)
        if not item:
            return Response(status=status.HTTP_404_NOT_FOUND)
        title = item.title
        item.delete()
        record_audit(request, 'gallery.item.delete', target=title)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminGalleryReorderView(APIView):
    """POST /api/v1/admin/gallery/items/reorder/  {"ids": [12, 3, 8, …]}

    The grid's order is the editorial decision the gallery is actually made
    of, and setting it by typing a number into 40 rows is not editing, it is
    data entry. One call writes the whole sequence.
    """

    permission_classes = [IsStaff]

    def post(self, request):
        ids = request.data.get('ids')
        if not isinstance(ids, list):
            return Response({'ids': 'Expected a list of item ids.'},
                            status=status.HTTP_400_BAD_REQUEST)

        items = {item.pk: item for item in GalleryItem.objects.filter(pk__in=ids)}
        updated = []
        for position, pk in enumerate(ids):
            item = items.get(pk)
            if item is None:
                continue
            item.order = position
            updated.append(item)

        if updated:
            GalleryItem.objects.bulk_update(updated, ['order'])
        record_audit(request, 'gallery.reorder', target=f'{len(updated)} items')
        return Response({'updated': len(updated)})


# ── Admin: categories ─────────────────────────────────────────────────

class AdminGalleryCategoryListView(APIView):
    """GET/POST /api/v1/admin/gallery/categories/"""

    permission_classes = [IsStaff]

    def get(self, request):
        categories = GalleryCategory.objects.annotate(item_count_annotated=Count('items'))
        return Response(AdminCategorySerializer(categories, many=True).data)

    def post(self, request):
        serializer = AdminCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        record_audit(request, 'gallery.category.create', target=category.slug)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminGalleryCategoryDetailView(APIView):
    """PATCH/DELETE /api/v1/admin/gallery/categories/<pk>/

    ⚠ DELETING A CATEGORY DOES NOT DELETE ITS ITEMS. The foreign key is
    SET_NULL, so they fall back to appearing under "All" — a tab losing its
    label rather than a shoot losing its photographs.
    """

    permission_classes = [IsStaff]

    def patch(self, request, pk):
        category = GalleryCategory.objects.filter(pk=pk).first()
        if not category:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = AdminCategorySerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit(request, 'gallery.category.update', target=category.slug)
        return Response(serializer.data)

    def delete(self, request, pk):
        category = GalleryCategory.objects.filter(pk=pk).first()
        if not category:
            return Response(status=status.HTTP_404_NOT_FOUND)
        slug = category.slug
        category.delete()
        record_audit(request, 'gallery.category.delete', target=slug)
        return Response(status=status.HTTP_204_NO_CONTENT)
