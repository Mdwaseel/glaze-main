"""Fold raw page views into daily totals and prune what has been folded.

Run nightly:

    python manage.py rollup_analytics

Two jobs, in this order and no other:

  1. Aggregate every complete day that has raw rows into DailyStat.
  2. Delete raw rows older than the retention window.

The order is the safety property. Rolling up before pruning means a day is
never deleted before its counts have been stored; the reverse would silently
lose history the first time the command ran late.

Today is deliberately excluded from step 1 — it is still accumulating, and a
partial day written into DailyStat would be wrong and would not be recomputed.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Avg, Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from analytics.models import DailyStat, PageView


class Command(BaseCommand):
    help = 'Roll raw page views into DailyStat and prune old raw rows.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--retain-days', type=int, default=90,
            help='Keep raw PageView rows for this many days (default: 90).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would happen without writing anything.',
        )

    def handle(self, *args, **options):
        retain = options['retain_days']
        dry_run = options['dry_run']
        today = timezone.localdate()

        rows = (
            PageView.objects.annotate(day=TruncDate('created_at'))
            .filter(day__lt=today)
            .values('day', 'path')
            .annotate(
                views=Count('id'),
                visitors=Count('visitor_hash', distinct=True),
                avg_duration=Avg('duration_ms'),
            )
        )

        written = 0
        for row in rows:
            if dry_run:
                written += 1
                continue
            DailyStat.objects.update_or_create(
                date=row['day'], path=row['path'],
                defaults={
                    'views': row['views'],
                    'unique_visitors': row['visitors'],
                    'avg_duration_ms': int(row['avg_duration'] or 0),
                },
            )
            written += 1

        cutoff = timezone.now() - timedelta(days=retain)
        stale = PageView.objects.filter(created_at__lt=cutoff)
        pruned = stale.count() if dry_run else stale.delete()[0]

        prefix = '[dry run] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}Rolled up {written} day/path rows; pruned {pruned} raw views older than {retain} days.'
        ))
