"""Load the catalogue seed into the database.

    python manage.py seed_catalogue            # create what is missing
    python manage.py seed_catalogue --force    # also overwrite what is there
    python manage.py seed_catalogue --dry-run  # say what it would do

The seed file is generated, not written by hand:

    node client/scripts/export-catalogue.mjs

SAFE BY DEFAULT. Once this has run the database is the catalogue and the
panel is where it is edited — so a second run leaves existing rows alone and
only fills in what is absent. That makes it re-runnable after adding a system
to the JS modules, and harmless if someone runs it twice, without it ever
being the thing that silently reverts an afternoon of editing. --force is the
"I mean it, put it back the way it shipped" switch.

Variants are matched on (system, key) for the same reason: re-running must not
duplicate a system's rail.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalogue.models import System, Variant

SEED_PATH = Path(__file__).resolve().parents[2] / 'seed' / 'catalogue.json'

# Everything the seed sets on a System, so --force can restore a row field for
# field without listing them twice.
SYSTEM_FIELDS = (
    'name', 'order', 'is_published',
    'page_title', 'meta_description',
    'schema_name', 'schema_category', 'schema_description',
    'hero_video', 'hero_image', 'hero_title', 'hero_accent', 'hero_lede',
    'overview_title_lead', 'overview_title_em', 'chips', 'overview_body',
    'stats', 'strengths',
    'series_note', 'fits', 'series_order',
    'card_video', 'card_poster', 'card_image',
    'teaser_lead', 'teaser_em', 'teaser_desc', 'teaser_specs', 'teaser_cta',
    'enquiry_note',
)

VARIANT_FIELDS = ('name', 'kind', 'lede', 'specs', 'video', 'poster', 'order', 'is_published')


class Command(BaseCommand):
    help = 'Seed the systems and variants catalogue from catalogue/seed/catalogue.json.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force', action='store_true',
            help='Overwrite systems and variants that already exist.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would change and write nothing.',
        )
        parser.add_argument(
            '--path', default=str(SEED_PATH),
            help='Seed file to read (defaults to catalogue/seed/catalogue.json).',
        )

    def handle(self, *args, **options):
        path = Path(options['path'])
        if not path.exists():
            raise CommandError(
                f'No seed file at {path}.\n'
                'Generate it first:  node client/scripts/export-catalogue.mjs',
            )

        try:
            payload = json.loads(path.read_text(encoding='utf-8'))
        except ValueError as exc:
            raise CommandError(f'{path} is not valid JSON: {exc}')

        systems = payload.get('systems')
        if not isinstance(systems, list):
            raise CommandError(f'{path} has no "systems" list.')

        force = options['force']
        dry = options['dry_run']

        created = updated = skipped = 0
        v_created = v_updated = v_skipped = 0

        # One transaction for the lot: a seed that stopped half way through
        # would leave a system on the site with none of its variants, which is
        # a page that renders an empty section rather than an obvious failure.
        with transaction.atomic():
            for entry in systems:
                slug = entry.get('slug')
                if not slug:
                    raise CommandError('A system entry has no slug.')

                system = System.objects.filter(slug=slug).first()

                if system is None:
                    system = System(slug=slug)
                    self._apply(system, entry, SYSTEM_FIELDS)
                    if not dry:
                        system.save()
                    created += 1
                    self.stdout.write(f'  + system  {slug}')
                elif force:
                    self._apply(system, entry, SYSTEM_FIELDS)
                    if not dry:
                        system.save()
                    updated += 1
                    self.stdout.write(f'  ~ system  {slug}')
                else:
                    skipped += 1
                    self.stdout.write(f'  = system  {slug} (exists — left alone)')

                # A dry run never created the system, so there is no row to
                # hang variants off; report them and move on.
                if dry and system.pk is None:
                    v_created += len(entry.get('variants') or [])
                    continue

                for row in entry.get('variants') or []:
                    key = row.get('key')
                    if not key:
                        raise CommandError(f'A {slug} variant has no key.')

                    variant = Variant.objects.filter(system=system, key=key).first()
                    if variant is None:
                        variant = Variant(system=system, key=key)
                        self._apply(variant, row, VARIANT_FIELDS)
                        if not dry:
                            variant.save()
                        v_created += 1
                    elif force:
                        self._apply(variant, row, VARIANT_FIELDS)
                        if not dry:
                            variant.save()
                        v_updated += 1
                    else:
                        v_skipped += 1

            if dry:
                transaction.set_rollback(True)

        self.stdout.write('')
        self.stdout.write(
            f'Systems : {created} created, {updated} updated, {skipped} left alone',
        )
        self.stdout.write(
            f'Variants: {v_created} created, {v_updated} updated, {v_skipped} left alone',
        )
        if dry:
            self.stdout.write(self.style.WARNING('Dry run — nothing was written.'))
        else:
            self.stdout.write(self.style.SUCCESS('Catalogue seeded.'))

    @staticmethod
    def _apply(instance, data, fields):
        for field in fields:
            if field in data:
                setattr(instance, field, data[field])
