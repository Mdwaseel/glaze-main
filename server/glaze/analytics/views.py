"""The tracking beacon and the dashboard aggregations."""

import re
from datetime import timedelta

from django.db.models import Avg, Count, F, Max, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from account.models import AuditLog, LoginAttempt
from account.permissions import IsStaff
from account.security import client_ip, user_agent as read_user_agent
from blog.models import Comment, Post
from siteconfig.models import Enquiry

from .models import DailyStat, PageView, visitor_hash

# A page is counted once per visitor per path per window. Reloads, back-button
# navigation and React re-mounts inside this window do not inflate the number.
DEDUPE_WINDOW = timedelta(minutes=30)

_MOBILE_RE = re.compile(r'iphone|ipod|android.*mobile|windows phone|blackberry', re.I)
_TABLET_RE = re.compile(r'ipad|android(?!.*mobile)|tablet|kindle|silk', re.I)


def classify_device(ua: str) -> str:
    """Coarse three-way split from the UA string.

    Tablet is tested first: an iPad's UA contains neither "mobile" nor a
    desktop marker, and most Android tablets say "Android" without "Mobile" —
    checking mobile first would file every tablet as desktop.
    """
    if _TABLET_RE.search(ua or ''):
        return PageView.DEVICE_TABLET
    if _MOBILE_RE.search(ua or ''):
        return PageView.DEVICE_MOBILE
    return PageView.DEVICE_DESKTOP


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def track(request):
    """POST /api/v1/analytics/track/ — the public beacon.

    Answers 204 unconditionally. Analytics must never be able to break a page,
    so a malformed payload, a duplicate inside the dedupe window and a
    successful record all look identical to the browser.
    """
    path = (request.data.get('path') or '').strip()[:300]
    if not path or not path.startswith('/'):
        return Response(status=status.HTTP_204_NO_CONTENT)

    ua = read_user_agent(request)
    who = visitor_hash(client_ip(request), ua)

    recent = PageView.objects.filter(
        visitor_hash=who, path=path, created_at__gte=timezone.now() - DEDUPE_WINDOW,
    ).exists()
    if recent:
        return Response(status=status.HTTP_204_NO_CONTENT)

    PageView.objects.create(
        path=path,
        title=(request.data.get('title') or '')[:200],
        referrer=(request.data.get('referrer') or '')[:500],
        visitor_hash=who,
        session_key=(request.data.get('session') or '')[:64],
        device=classify_device(ua),
    )

    # Keep Post.view_count in step. This is the ONLY place it is incremented,
    # so it inherits the dedupe above rather than counting API re-fetches.
    match = re.match(r'^/blog/([\w-]+)/?$', path)
    if match:
        Post.objects.filter(slug=match.group(1)).update(view_count=F('view_count') + 1)

    return Response(status=status.HTTP_204_NO_CONTENT)


track.throttle_scope = 'track'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def track_duration(request):
    """POST /api/v1/analytics/duration/ — how long the last page was open.

    Sent via navigator.sendBeacon on pagehide, which is the only unload signal
    browsers still honour reliably. Best-effort by nature: a closed laptop
    never reports.
    """
    path = (request.data.get('path') or '').strip()[:300]
    try:
        duration = min(int(request.data.get('duration_ms') or 0), 3_600_000)
    except (TypeError, ValueError):
        return Response(status=status.HTTP_204_NO_CONTENT)

    if path and duration > 0:
        who = visitor_hash(client_ip(request), read_user_agent(request))
        latest = PageView.objects.filter(
            visitor_hash=who, path=path, duration_ms__isnull=True,
        ).order_by('-created_at').first()
        if latest:
            latest.duration_ms = duration
            latest.save(update_fields=['duration_ms'])

    return Response(status=status.HTTP_204_NO_CONTENT)


track_duration.throttle_scope = 'track'


def _percent_change(current: int, previous: int) -> float | None:
    """Change vs the preceding window.

    None rather than 0 when the previous window was empty: "up 100%" from a
    base of zero is meaningless, and the UI shows a dash instead of a
    misleading trend arrow.
    """
    if not previous:
        return None
    return round(((current - previous) / previous) * 100, 1)


class DashboardView(APIView):
    """GET /api/v1/admin/analytics/?days=30 — everything the overview renders.

    One endpoint rather than eight. The dashboard is a single screen; eight
    round trips would make it paint in pieces, and every query here is cheap
    and indexed.
    """

    permission_classes = [IsStaff]

    def get(self, request):
        try:
            days = max(1, min(int(request.query_params.get('days', 30)), 365))
        except (TypeError, ValueError):
            days = 30

        now = timezone.now()
        window_start = now - timedelta(days=days)
        previous_start = now - timedelta(days=days * 2)

        current = PageView.objects.filter(created_at__gte=window_start)
        previous = PageView.objects.filter(
            created_at__gte=previous_start, created_at__lt=window_start,
        )

        views_now = current.count()
        views_before = previous.count()
        uniques_now = current.values('visitor_hash').distinct().count()
        uniques_before = previous.values('visitor_hash').distinct().count()

        enquiries_now = Enquiry.objects.filter(created_at__gte=window_start).count()
        enquiries_before = Enquiry.objects.filter(
            created_at__gte=previous_start, created_at__lt=window_start,
        ).count()

        # ── Daily series, gap-filled ──────────────────────────────────
        # A day with no traffic produces no row, and a chart that simply skips
        # those days silently compresses the x-axis and misreads as steady
        # traffic. Every date in the range is emitted, zero or not.
        buckets = {
            row['day']: row
            for row in current.annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(views=Count('id'), visitors=Count('visitor_hash', distinct=True))
        }
        today = timezone.localdate()
        series = []
        for offset in range(days - 1, -1, -1):
            day = today - timedelta(days=offset)
            row = buckets.get(day)
            series.append({
                'date': day.isoformat(),
                'views': row['views'] if row else 0,
                'visitors': row['visitors'] if row else 0,
            })

        top_pages = list(
            current.values('path')
            .annotate(
                views=Count('id'),
                visitors=Count('visitor_hash', distinct=True),
                avg_duration=Avg('duration_ms'),
            )
            .order_by('-views')[:10]
        )
        for page in top_pages:
            page['avg_duration'] = int(page['avg_duration'] or 0)

        devices = {
            row['device']: row['count']
            for row in current.values('device').annotate(count=Count('id'))
        }

        referrers = list(
            current.exclude(referrer='')
            .values('referrer')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )

        top_posts = list(
            Post.objects.published()
            .order_by('-view_count')
            .values('title', 'slug', 'view_count', 'reading_time')[:8]
        )

        return Response({
            'range_days': days,
            'generated_at': now,
            'totals': {
                'views': views_now,
                'views_change': _percent_change(views_now, views_before),
                'visitors': uniques_now,
                'visitors_change': _percent_change(uniques_now, uniques_before),
                'enquiries': enquiries_now,
                'enquiries_change': _percent_change(enquiries_now, enquiries_before),
                'avg_duration_ms': int(
                    current.filter(duration_ms__isnull=False).aggregate(v=Avg('duration_ms'))['v'] or 0
                ),
            },
            'content': {
                'posts_published': Post.objects.published().count(),
                'posts_draft': Post.objects.filter(status=Post.STATUS_DRAFT).count(),
                'posts_scheduled': Post.objects.filter(status=Post.STATUS_SCHEDULED).count(),
                'comments_pending': Comment.objects.filter(status=Comment.STATUS_PENDING).count(),
                'enquiries_new': Enquiry.objects.filter(status=Enquiry.STATUS_NEW).count(),
                'total_page_views_all_time': PageView.objects.count(),
            },
            'series': series,
            'top_pages': top_pages,
            'top_posts': top_posts,
            'devices': {
                'desktop': devices.get(PageView.DEVICE_DESKTOP, 0),
                'tablet': devices.get(PageView.DEVICE_TABLET, 0),
                'mobile': devices.get(PageView.DEVICE_MOBILE, 0),
            },
            'referrers': referrers,
            'security': {
                'failed_logins_24h': LoginAttempt.objects.filter(
                    successful=False, created_at__gte=now - timedelta(hours=24),
                ).count(),
                'successful_logins_24h': LoginAttempt.objects.filter(
                    successful=True, created_at__gte=now - timedelta(hours=24),
                ).count(),
            },
            'recent_activity': list(
                AuditLog.objects.values('actor_email', 'action', 'target', 'created_at')[:12]
            ),
        })


class PagesReportView(APIView):
    """GET /api/v1/admin/analytics/pages/?days=30 — the per-page table.

    Answers "how many pages does the site have, and how did each do", which is
    the question the dashboard's summary top-10 deliberately does not.
    """

    permission_classes = [IsStaff]

    def get(self, request):
        try:
            days = max(1, min(int(request.query_params.get('days', 30)), 365))
        except (TypeError, ValueError):
            days = 30

        since = timezone.now() - timedelta(days=days)
        rows = list(
            PageView.objects.filter(created_at__gte=since)
            .values('path')
            .annotate(
                views=Count('id'),
                visitors=Count('visitor_hash', distinct=True),
                avg_duration=Avg('duration_ms'),
                last_seen=Max('created_at'),
            )
            .order_by('-views')
        )

        for row in rows:
            row['avg_duration'] = int(row['avg_duration'] or 0)

        return Response({
            'range_days': days,
            'page_count': len(rows),
            'results': rows,
        })


class SecurityReportView(APIView):
    """GET /api/v1/admin/analytics/security/ — login attempts and the audit trail."""

    permission_classes = [IsStaff]

    def get(self, request):
        now = timezone.now()
        since = now - timedelta(days=7)

        return Response({
            'attempts': list(
                LoginAttempt.objects.filter(created_at__gte=since)
                .values('email', 'ip_address', 'successful', 'reason', 'created_at')[:100]
            ),
            'by_day': list(
                LoginAttempt.objects.filter(created_at__gte=since)
                .annotate(day=TruncDate('created_at'))
                .values('day')
                .annotate(
                    failed=Count('id', filter=Q(successful=False)),
                    ok=Count('id', filter=Q(successful=True)),
                )
                .order_by('day')
            ),
            'audit': list(
                AuditLog.objects.values(
                    'actor_email', 'action', 'target', 'detail', 'ip_address', 'created_at',
                )[:100]
            ),
        })
