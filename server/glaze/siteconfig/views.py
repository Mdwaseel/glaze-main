from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from account.permissions import IsStaff
from account.security import client_ip, record_audit

from .defaults import DEFAULT_AUTO_REPLY_HTML, PLACEHOLDERS
from .mailer import send_enquiry_emails, send_test_auto_reply, send_test_notification
from .models import ContactSettings, Enquiry, SiteSettings
from .serializers import (
    AdminEnquirySerializer,
    AdminSiteSettingsSerializer,
    ContactSettingsSerializer,
    EnquirySerializer,
    PublicSiteSettingsSerializer,
)


class PublicSiteSettingsView(APIView):
    """GET /api/v1/site-settings/ — the public site's runtime configuration.

    Read by the React app on boot to fill the navbar, footer and contact
    sections. Anonymous, cacheable, and carries no internal fields.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(PublicSiteSettingsSerializer(SiteSettings.load()).data)


class AdminSiteSettingsView(APIView):
    """GET/PATCH /api/v1/admin/site-settings/"""

    permission_classes = [IsStaff]
    # No parser_classes override — DRF's defaults already include
    # MultiPartParser, which is what the OG image upload needs.

    def get(self, request):
        return Response(AdminSiteSettingsSerializer(SiteSettings.load()).data)

    def patch(self, request):
        instance = SiteSettings.load()
        serializer = AdminSiteSettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        record_audit(
            request, 'settings.site.update', target='SiteSettings',
            fields=sorted(serializer.validated_data.keys()),
        )
        return Response(serializer.data)


class AdminContactSettingsView(APIView):
    """GET/PATCH /api/v1/admin/contact-settings/

    The audit entry records WHICH fields changed but never their values —
    recipient addresses and the reply body would bloat the trail, and the
    point of the entry is accountability, not a diff.
    """

    permission_classes = [IsStaff]

    def get(self, request):
        data = ContactSettingsSerializer(ContactSettings.load()).data
        # Shipped alongside so the admin UI can render the placeholder legend
        # and the "Reset to Default" button without hard-coding either.
        data['placeholders'] = PLACEHOLDERS
        data['default_auto_reply_html'] = DEFAULT_AUTO_REPLY_HTML
        return Response(data)

    def patch(self, request):
        instance = ContactSettings.load()
        serializer = ContactSettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        record_audit(
            request, 'settings.contact.update', target='ContactSettings',
            fields=sorted(serializer.validated_data.keys()),
        )
        return Response(serializer.data)


class AdminTestAutoReplyView(APIView):
    """POST /api/v1/admin/contact-settings/test/

    Two tests behind one endpoint, chosen by `kind`:

      auto_reply    what a customer gets back. Proves SMTP works and the HTML
                    renders. Always goes to the address given.
      notification  what the team gets. Proves ROUTING works — with no
                    `email` it goes to the real recipients for `category`,
                    which is the only way to find out that the address typed
                    in for a colleague has a typo in it.
    """

    permission_classes = [IsStaff]

    def post(self, request):
        kind = (request.data.get('kind') or 'auto_reply').strip()
        to_email = (request.data.get('email') or '').strip()

        if kind == 'notification':
            category = (request.data.get('category') or Enquiry.CATEGORY_GENERAL).strip()
            if category not in dict(Enquiry.CATEGORY_CHOICES):
                return Response(
                    {'detail': f'Unknown enquiry type "{category}".'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                sent_to = send_test_notification(category, to_email)
            except ValueError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as exc:
                return Response(
                    {'detail': f'Could not send: {exc}'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            record_audit(
                request, 'settings.contact.test_notification',
                target=category, recipients=sent_to,
            )
            return Response({
                'detail': f'Test notification sent to {", ".join(sent_to)}.',
                'recipients': sent_to,
            })

        # Falls back to the signed-in admin's own address, which is the one
        # they can check without asking anyone.
        to_email = to_email or (request.user.email or '')
        if not to_email:
            return Response({'detail': 'An email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_test_auto_reply(to_email)
        except Exception as exc:
            # Surfaced rather than swallowed: the entire point of a test send is
            # to learn that SMTP is misconfigured.
            return Response(
                {'detail': f'Could not send: {exc}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        record_audit(request, 'settings.contact.test_email', target=to_email)
        return Response({'detail': f'Test auto-reply sent to {to_email}.'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def submit_enquiry(request):
    """POST /api/v1/enquiries/ — the public contact form.

    Always answers 201 once the row is stored, even if both emails fail. The
    enquiry is safe in the database at that point, and telling a visitor their
    message failed when it did not would cost a real lead.
    """
    serializer = EnquirySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    honeypot = serializer.validated_data.pop('website', '')
    enquiry = Enquiry(**serializer.validated_data)
    enquiry.ip_address = client_ip(request)
    # Derived here, never read from the payload — see Enquiry.categorise. It is
    # what decides which inbox the notification goes to.
    enquiry.category = Enquiry.categorise(enquiry.source_path)

    if honeypot:
        # Stored, not emailed. Keeping the row makes it possible to check later
        # whether the honeypot is catching bots or false-positiving on a
        # password manager that autofills hidden fields.
        enquiry.status = Enquiry.STATUS_SPAM
        enquiry.save()
        return Response({'detail': 'Thank you. We will be in touch shortly.'}, status=status.HTTP_201_CREATED)

    enquiry.save()
    send_enquiry_emails(enquiry)

    return Response(
        {'id': enquiry.id, 'detail': 'Thank you. We will be in touch shortly.'},
        status=status.HTTP_201_CREATED,
    )


submit_enquiry.throttle_scope = 'enquiry'


class AdminEnquiryListView(APIView):
    """GET /api/v1/admin/enquiries/ — the inbox."""

    permission_classes = [IsStaff]

    def get(self, request):
        queryset = Enquiry.objects.all()

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Which inbox it was routed to — the same split the recipient settings
        # are organised by, so "show me the product enquiries" is one click.
        category_filter = request.query_params.get('category')
        if category_filter:
            queryset = queryset.filter(category=category_filter)

        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(AdminEnquirySerializer(page, many=True).data)


class AdminEnquiryDetailView(APIView):
    """PATCH/DELETE /api/v1/admin/enquiries/<pk>/ — only `status` is writable."""

    permission_classes = [IsStaff]

    def patch(self, request, pk):
        try:
            enquiry = Enquiry.objects.get(pk=pk)
        except Enquiry.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminEnquirySerializer(enquiry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit(request, 'enquiry.update', target=str(pk), status=enquiry.status)
        return Response(serializer.data)

    def delete(self, request, pk):
        deleted, _ = Enquiry.objects.filter(pk=pk).delete()
        if not deleted:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        record_audit(request, 'enquiry.delete', target=str(pk))
        return Response(status=status.HTTP_204_NO_CONTENT)
