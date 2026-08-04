"""First-party page-view analytics.

Built in rather than bolted on because the dashboard needs numbers it can
join against its own content — "which article was read most" is a question
Google Analytics cannot answer without an export.

No raw IP address and no cookie is ever stored. A visitor is identified by

    visitor_hash = HMAC-SHA256(K_day, ip || user_agent)
    K_day        = HMAC-SHA256(SECRET_KEY, "analytics-salt:" || YYYY-MM-DD)

The key rotates at midnight UTC, so the same person browsing on two
consecutive days produces two unrelated hashes. That is the point: the number
is enough to count uniques within a day and useless for building a profile
across days. It also means the table holds no personal data to leak, and the
site needs no cookie banner for its own analytics.

Being a keyed HMAC rather than a plain hash matters for the same reason it
does in the captcha: the IPv4 space is 2^32, which is trivially enumerable
against a bare SHA-256 to recover the original address. Without the server key
there is nothing to enumerate.
"""

import hashlib
import hmac

from django.conf import settings
from django.db import models
from django.utils import timezone


def visitor_hash(ip: str, user_agent: str, when=None) -> str:
    """Daily-rotating pseudonymous identifier. See the module docstring."""
    day = (when or timezone.now()).strftime('%Y-%m-%d')
    daily_key = hmac.new(
        settings.SECRET_KEY.encode(), f'analytics-salt:{day}'.encode(), hashlib.sha256,
    ).digest()
    return hmac.new(daily_key, f'{ip}|{user_agent}'.encode(), hashlib.sha256).hexdigest()


class PageView(models.Model):
    DEVICE_DESKTOP = 'desktop'
    DEVICE_TABLET = 'tablet'
    DEVICE_MOBILE = 'mobile'
    DEVICE_CHOICES = [
        (DEVICE_DESKTOP, 'Desktop'),
        (DEVICE_TABLET, 'Tablet'),
        (DEVICE_MOBILE, 'Mobile'),
    ]

    path = models.CharField(max_length=300, db_index=True)
    title = models.CharField(max_length=200, blank=True)
    referrer = models.CharField(max_length=500, blank=True)

    visitor_hash = models.CharField(max_length=64, db_index=True)
    # Supplied by the browser and stable for one tab session (sessionStorage).
    # Used to tell "two pages in one visit" from "two visits".
    session_key = models.CharField(max_length=64, blank=True, db_index=True)

    device = models.CharField(max_length=10, choices=DEVICE_CHOICES, default=DEVICE_DESKTOP)
    # Set by a later beacon when the visitor leaves the page, so it is null for
    # the last page of any visit and for anyone who closes the tab abruptly.
    duration_ms = models.PositiveIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'analytics_page_view'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['path', 'created_at']),
            models.Index(fields=['visitor_hash', 'created_at']),
        ]

    def __str__(self):
        return f'{self.path} at {self.created_at:%Y-%m-%d %H:%M}'


class DailyStat(models.Model):
    """Pre-rolled daily totals.

    PageView is the raw record and answers anything, but scanning it for a
    12-month chart gets slower every day. This table is written once per day
    per path by the `rollup_analytics` command and keeps the dashboard's range
    queries flat as the raw table grows.

    Raw rows older than the retention window are deleted by the same command;
    these survive, so history is kept as counts rather than as a row per visit.
    """

    date = models.DateField(db_index=True)
    path = models.CharField(max_length=300, db_index=True)
    views = models.PositiveIntegerField(default=0)
    unique_visitors = models.PositiveIntegerField(default=0)
    avg_duration_ms = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'analytics_daily_stat'
        ordering = ('-date',)
        constraints = [
            models.UniqueConstraint(fields=['date', 'path'], name='uniq_daily_stat_date_path'),
        ]

    def __str__(self):
        return f'{self.date} {self.path}: {self.views}'
