"""Catalogue endpoints.

One public read for the whole catalogue, and CRUD behind IsStaff.

WHY THE PUBLIC ENDPOINT RETURNS EVERYTHING IN ONE RESPONSE rather than a list
and a detail: the client needs the full set on nearly every page. The nav's
footer column lists every system, the carousel is every system, a system page
shows cross-links to every other one, and both enquiry forms offer every
system with its variants. Seven systems with their variants is a payload of a
few tens of kilobytes fetched once per session — smaller than one of the
posters on the page, and it makes the client's fallback a straight swap rather
than a per-route decision.
"""

from django.db.models import Prefetch
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from account.permissions import IsStaff
from account.security import record_audit

from .models import System, Variant
from .serializers import (
    AdminSystemListSerializer,
    AdminSystemSerializer,
    AdminVariantSerializer,
    PublicSystemSerializer,
)


class PublicCatalogueView(APIView):
    """GET /api/v1/catalogue/ — every published system with its variants."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        systems = (
            System.objects.filter(is_published=True)
            .prefetch_related(
                # Ordered here rather than in the serialiser: the model's
                # Meta.ordering applies to the related manager too, but being
                # explicit means a later change to Meta cannot silently
                # reshuffle a page's variant rail.
                Prefetch('variants', queryset=Variant.objects.order_by('order', 'id')),
            )
        )
        return Response({'systems': PublicSystemSerializer(systems, many=True).data})


# ── Admin ─────────────────────────────────────────────────────────────

class AdminSystemListView(APIView):
    """GET/POST /api/v1/admin/systems/

    Unpaginated on purpose. This is a catalogue of seven, not a feed — a page
    control over it would be furniture.
    """

    permission_classes = [IsStaff]

    def get(self, request):
        systems = System.objects.prefetch_related('variants')
        return Response(AdminSystemListSerializer(systems, many=True).data)

    def post(self, request):
        serializer = AdminSystemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        system = serializer.save()
        record_audit(request, 'catalogue.system.create', target=system.slug)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminSystemDetailView(APIView):
    """GET/PATCH/DELETE /api/v1/admin/systems/<slug>/

    Keyed by slug rather than id because that is what the editor's URL carries
    and what every other reference to a system uses.
    """

    permission_classes = [IsStaff]

    def get_object(self, slug):
        return System.objects.prefetch_related('variants').filter(slug=slug).first()

    def get(self, request, slug):
        system = self.get_object(slug)
        if not system:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminSystemSerializer(system).data)

    def patch(self, request, slug):
        system = self.get_object(slug)
        if not system:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminSystemSerializer(system, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit(
            request, 'catalogue.system.update', target=slug,
            fields=sorted(serializer.validated_data.keys()),
        )
        return Response(serializer.data)

    def delete(self, request, slug):
        system = self.get_object(slug)
        if not system:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Cascades to the system's variants — which is why the panel asks for
        # confirmation naming the count rather than a bare "are you sure".
        count = system.variants.count()
        system.delete()
        record_audit(request, 'catalogue.system.delete', target=slug, variants=count)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminVariantListView(APIView):
    """GET/POST /api/v1/admin/systems/<slug>/variants/"""

    permission_classes = [IsStaff]

    def get(self, request, slug):
        system = System.objects.filter(slug=slug).first()
        if not system:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminVariantSerializer(system.variants.all(), many=True).data)

    def post(self, request, slug):
        system = System.objects.filter(slug=slug).first()
        if not system:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminVariantSerializer(data=request.data, context={'system': system})
        serializer.is_valid(raise_exception=True)
        # `system` is read-only on the serialiser: which system a variant
        # belongs to is the URL's business, not the body's, so a payload
        # cannot quietly file it under a different one.
        variant = serializer.save(system=system)
        record_audit(request, 'catalogue.variant.create', target=f'{slug}/{variant.key}')
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminVariantDetailView(APIView):
    """PATCH/DELETE /api/v1/admin/variants/<pk>/"""

    permission_classes = [IsStaff]

    def patch(self, request, pk):
        variant = Variant.objects.filter(pk=pk).select_related('system').first()
        if not variant:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminVariantSerializer(
            variant, data=request.data, partial=True, context={'system': variant.system},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit(
            request, 'catalogue.variant.update',
            target=f'{variant.system.slug}/{variant.key}',
            fields=sorted(serializer.validated_data.keys()),
        )
        return Response(serializer.data)

    def delete(self, request, pk):
        variant = Variant.objects.filter(pk=pk).select_related('system').first()
        if not variant:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        target = f'{variant.system.slug}/{variant.key}'
        variant.delete()
        record_audit(request, 'catalogue.variant.delete', target=target)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminVariantReorderView(APIView):
    """POST /api/v1/admin/systems/<slug>/variants/reorder/  {"keys": [...]}

    The rail is a sequence the visitor scrolls through, so the order is
    editorial rather than incidental — and dragging a row is the only sane way
    to express "this one goes second". One request for the whole list, because
    moving one variant renumbers its neighbours and N PATCHes could interleave
    into a state nobody asked for.
    """

    permission_classes = [IsStaff]

    def post(self, request, slug):
        system = System.objects.filter(slug=slug).first()
        if not system:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        keys = request.data.get('keys')
        if not isinstance(keys, list):
            return Response(
                {'detail': 'Send {"keys": ["variant-key", …]} in the new order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        by_key = {v.key: v for v in system.variants.all()}
        missing = [k for k in keys if k not in by_key]
        if missing:
            return Response(
                {'detail': f'Unknown variant(s): {", ".join(missing)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for index, key in enumerate(keys):
            by_key[key].order = index
        Variant.objects.bulk_update(by_key.values(), ['order'])

        record_audit(request, 'catalogue.variant.reorder', target=slug)
        return Response(AdminVariantSerializer(system.variants.all(), many=True).data)
