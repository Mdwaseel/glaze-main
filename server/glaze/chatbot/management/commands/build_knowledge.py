"""Load the assistant's knowledge base.

    node client/scripts/export-knowledge.mjs   # regenerate the JSON first
    python manage.py build_knowledge

Two sources, joined here:

  site-content.json   systems and series generated from src/data/systems.js,
                      plus the curated section copy. Rebuilt by the Node
                      script whenever page content changes.

  the database        published blog posts and the current contact details.
                      Pulled live rather than exported, because both change
                      through the admin panel without a rebuild — a bot
                      quoting last month's phone number is worse than one
                      that has no phone number.

Deletion is part of the contract. Any chunk whose key is absent from this
run is removed, so unpublishing an article or deleting a system also takes
it out of the assistant's mouth. Without that, the knowledge base only ever
grows and starts answering from content the site no longer shows.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from blog.models import Post
from blog.sanitize import strip_tags_for_count
from chatbot.models import KnowledgeChunk
from chatbot.retrieval import rebuild_vectors
from siteconfig.models import SiteSettings

CORPUS = Path(__file__).resolve().parents[2] / 'knowledge' / 'site-content.json'


class Command(BaseCommand):
    help = 'Rebuild the site assistant knowledge base from site data, blog posts and settings.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-blog', action='store_true',
            help='Do not ingest blog posts.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not CORPUS.exists():
            raise CommandError(
                f'{CORPUS} not found.\n'
                'Generate it first:  node client/scripts/export-knowledge.mjs'
            )

        try:
            payload = json.loads(CORPUS.read_text(encoding='utf-8'))
        except json.JSONDecodeError as exc:
            raise CommandError(f'{CORPUS} is not valid JSON: {exc}')

        records = list(payload.get('chunks', []))
        counts = {'file': len(records)}

        if not options['skip_blog']:
            records += self._blog_chunks()
            counts['blog'] = len(records) - counts['file']

        records += self._settings_chunks()
        counts['settings'] = len(records) - counts['file'] - counts.get('blog', 0)

        seen = set()
        created = updated = 0

        for record in records:
            key = record['key']
            if key in seen:
                self.stderr.write(self.style.WARNING(f'  duplicate key skipped: {key}'))
                continue
            seen.add(key)

            _, was_created = KnowledgeChunk.objects.update_or_create(
                key=key,
                defaults={
                    'title': record['title'][:200],
                    'body': record['body'],
                    'keywords': record.get('keywords', ''),
                    'topic': record.get('topic', 'company'),
                    'source_label': record.get('source_label', '')[:120],
                    'source_path': record.get('source_path', '')[:200],
                },
            )
            created += was_created
            updated += not was_created

        stale = KnowledgeChunk.objects.exclude(key__in=seen)
        removed = stale.count()
        stale.delete()

        # One UPDATE across the table, after every row is in place.
        indexed = rebuild_vectors()

        self.stdout.write(self.style.SUCCESS(
            f'Knowledge base rebuilt: {created} new, {updated} updated, {removed} removed.\n'
            f'  sources: {counts}\n'
            f'  {indexed} chunks indexed for search.'
        ))

    def _blog_chunks(self):
        """One chunk per published article.

        The excerpt and takeaways carry most of the answerable substance and
        stay well inside the context budget; the full body of a 2,000-word
        article would crowd out every other passage. The source path sends
        the visitor to the article to read the rest.
        """
        out = []
        for post in Post.objects.published().select_related('category', 'author'):
            takeaways = '\n'.join(f'- {line}' for line in post.takeaway_list)
            body = strip_tags_for_count(post.content)
            # Collapse the whitespace the tag-stripping leaves behind.
            body = ' '.join(body.split())

            out.append({
                'key': f'blog:{post.slug}',
                'title': post.title,
                'topic': 'blog',
                'source_label': 'Journal',
                'source_path': f'/blog/{post.slug}',
                'keywords': ' '.join(
                    [post.focus_keyword] + [t.name for t in post.tags.all()]
                ),
                'body': '\n\n'.join(filter(None, [
                    post.excerpt,
                    f'Key points:\n{takeaways}' if takeaways else '',
                    body[:2500],
                ])),
            })
        return out

    def _settings_chunks(self):
        """Contact details, straight from the singleton the site itself reads."""
        site = SiteSettings.load()
        lines = [
            f'{site.site_name} can be reached by email at {site.contact_email} '
            f'and by phone on {site.contact_phone}.',
        ]
        if site.contact_phone_secondary:
            lines.append(f'Alternative number: {site.contact_phone_secondary}.')
        if site.whatsapp_link:
            lines.append(f'WhatsApp is available on {site.whatsapp_number}.')
        lines.append(f'Address: {" ".join(site.address.split())}')
        lines.append(f'Opening hours: {site.business_hours}.')

        return [{
            'key': 'contact:details',
            'title': 'Contact details and opening hours',
            'topic': 'contact',
            'source_label': 'Contact',
            'source_path': '/contact',
            'keywords': (
                'phone number email address whatsapp call reach hours open '
                'timing location where located directions map'
            ),
            'body': '\n'.join(lines),
        }]
