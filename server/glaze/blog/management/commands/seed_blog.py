"""Seed the blog with categories, an author and one fully-worked sample article.

    python manage.py seed_blog

Idempotent — re-running updates the sample rather than duplicating it, so it
is safe to use as a "reset the demo content" button.

The sample is real Glaze subject matter, not lorem ipsum, and exercises every
feature the article template supports: all five callout components, a spec
table, a pull quote, key takeaways, tags, SEO fields and a byline. If a
rendering bug exists, this post surfaces it.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from blog.models import Author, Category, Post, Tag
from siteconfig.models import ContactSettings, SiteSettings

CATEGORIES = [
    ('Systems', 'How our window and door systems are engineered, and where each one belongs.', '#726655', 1),
    ('Performance', 'Thermal, acoustic and weather performance — measured, not claimed.', '#A79A87', 2),
    ('Design Notes', 'Detailing, sightlines and the architecture of disappearing.', '#4A4136', 3),
    ('Projects', 'Buildings we have glazed, and what each one taught us.', '#8A7F6D', 4),
]

SAMPLE_CONTENT = """
<p class="bl-lead">Every specification conversation about aluminium windows arrives at the same
question sooner or later: why does one system cost forty per cent more than another that looks
identical in elevation? The answer is almost always buried in a part of the profile nobody sees.</p>

<h2>The bridge you are trying to break</h2>

<p>Aluminium conducts heat roughly a thousand times better than uPVC. That is exactly what you want
in a heat sink and exactly what you do not want in a window frame. An unbroken aluminium profile
spanning from the outside face to the inside face is a thermal bridge: it carries outdoor
temperature straight through the wall, regardless of how good the glass is.</p>

<p>A thermal break interrupts that path. Two separate aluminium shells — outer and inner — are
mechanically locked to an insulating bar, usually polyamide reinforced with glass fibre. Heat has
to cross the polyamide to get from one shell to the other, and polyamide is a poor conductor. The
frame stops being one piece of metal and starts being two, held apart.</p>

<div class="bl-insight">
<p><strong>The number that matters.</strong> Uf is the frame's own thermal transmittance in
W/m²K. Lower is better. A non-broken aluminium frame sits around 5.5. A 24 mm polyamide break
brings the same profile to roughly 2.2, and a 34 mm break with insulated cavities reaches 1.6.
The glass has not changed once in that sequence.</p>
</div>

<h2>Why break depth is not the whole story</h2>

<p>Depth is the headline figure, and it is the one most easily compared across quotations. It is
also the one most easily gamed. Two systems can both advertise a 34 mm break and perform
differently, because what happens in the cavity between the polyamide bars matters nearly as much
as the bars themselves.</p>

<p>An empty cavity convects. Warm air rises against the inner shell, cools against the outer, and
falls — a small circulating loop that moves heat across the gap the polyamide was installed to
block. Filling that cavity with closed-cell foam, or subdividing it with foil baffles, stops the
loop.</p>

<div class="bl-expert">
<p><strong>From our engineering floor.</strong> Ask any supplier for the tested Uf of the specific
profile you are being quoted, not the best figure in their catalogue. A system family will contain
a flagship profile that hits the marketing number and a dozen working profiles that do not. The
mullion you actually receive is rarely the one on the brochure cover.</p>
</div>

<h2>What it costs you in sightline</h2>

<p>Thermal performance and slim sightlines pull in opposite directions. A deeper break needs a
deeper profile, and a deeper profile is a wider face. This is the real trade, and it is why the
highest-performing system is not automatically the right specification.</p>

<table class="bl-spec">
  <thead>
    <tr><th scope="col">Break depth</th><th scope="col">Typical Uf</th><th scope="col">Min. sightline</th><th scope="col">Best suited to</th></tr>
  </thead>
  <tbody>
    <tr><td>None</td><td>~5.5</td><td>22 mm</td><td>Internal screens, covered balconies</td></tr>
    <tr><td>18–24 mm</td><td>~2.6</td><td>45 mm</td><td>Most residential glazing in temperate zones</td></tr>
    <tr><td>24–34 mm</td><td>~2.0</td><td>58 mm</td><td>Exposed elevations, cold or coastal sites</td></tr>
    <tr><td>34 mm + insulated cavity</td><td>~1.6</td><td>72 mm</td><td>Passive-house and near-zero-energy targets</td></tr>
  </tbody>
</table>

<div class="bl-note">
<p>Sightline figures above are for a fixed light. An opening vent adds its own frame to the
composition, so a casement will always read heavier than a fixed pane in the same system. Where a
slim line is the whole point of the elevation, fix what does not need to open.</p>
</div>

<h2>The condensation question</h2>

<p>Thermal breaks are usually sold on energy bills. In practice the complaint that brings people
back to us is condensation, and that is a surface-temperature problem rather than an energy one.</p>

<p>When the inner face of a frame drops below the dew point of the room air, water forms on it.
In a humid Indian monsoon interior at 26 °C and 70% relative humidity, dew point sits near
20 °C. An unbroken aluminium frame on a 15 °C night will sit at roughly 17 °C on its inner face
and stream with water. The same frame with a 24 mm break holds around 22 °C and stays dry.</p>

<blockquote>
<p>Specify for the coldest inside surface, not the average. Mould does not care about your average.</p>
</blockquote>

<div class="bl-warning">
<p><strong>The detail that undoes the system.</strong> A thermally broken frame installed into an
uninsulated reveal simply relocates the cold bridge from the frame to the wall around it. The
window will pass its test certificate and the plaster beside it will still blacken. Insulate the
reveal and tape the perimeter, or the specification was theatre.</p>
</div>

<h2>Choosing, in practice</h2>

<p>For most projects in Hyderabad, Bengaluru and Chennai, an 18–24 mm break is the sensible floor
and anything beyond it is buying performance the climate will not repay. For hill stations, coastal
exposure and any elevation carrying large glass on a north face, go deeper and accept the
sightline.</p>

<div class="bl-tip">
<p>Bring the glazing and the frame decision to the same meeting. A 1.6 Uf frame carrying single
glazing is a rounding error, and a triple-glazed unit in a 5.5 frame condenses on the aluminium
while the glass stays clear. The assembly performs as a whole or not at all.</p>
</div>

<p>Our systems team will run a Uw calculation for your actual elevation — frame, glass, spacer and
opening ratio together — before anything is quoted. It takes an afternoon and it has changed the
specification on more projects than it has confirmed.</p>
""".strip()

TAKEAWAYS = """Aluminium conducts heat ~1000× better than uPVC, so an unbroken frame is a thermal bridge regardless of the glass.
A 24 mm polyamide break takes the same profile from roughly 5.5 to 2.2 W/m²K without touching the glazing.
Break depth alone is not the spec — an unfilled cavity convects heat across the gap the break was meant to block.
Deeper break means wider sightline; the highest-performing system is not automatically the right one.
Condensation is a surface-temperature problem, and it is the complaint that actually brings people back.
A broken frame in an uninsulated reveal just moves the cold bridge into the wall."""


class Command(BaseCommand):
    help = 'Seed blog categories, a sample author and one worked sample article.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset', action='store_true',
            help='Delete every existing post first. Categories and authors are kept.',
        )

    def handle(self, *args, **options):
        if options['reset']:
            deleted, _ = Post.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Deleted {deleted} existing post rows.'))

        # Singletons — created here so a fresh database has settings to serve
        # before anyone opens the admin panel.
        SiteSettings.load()
        ContactSettings.load()

        categories = {}
        for name, description, colour, order in CATEGORIES:
            category, created = Category.objects.get_or_create(
                name=name,
                defaults={'description': description, 'accent_color': colour, 'order': order},
            )
            categories[name] = category
            if created:
                self.stdout.write(f'  + category: {name}')

        author, created = Author.objects.get_or_create(
            name='Arjun Rao',
            defaults={
                'role': 'Head of Systems Engineering',
                'bio': (
                    'Arjun has specified and tested aluminium fenestration for eighteen years, '
                    'most of them on projects where the window had to survive a monsoon and '
                    'disappear from the elevation at the same time.'
                ),
                'email': 'systems@glazewindowsystems.com',
            },
        )
        if created:
            self.stdout.write('  + author: Arjun Rao')

        post, created = Post.objects.update_or_create(
            slug='thermal-breaks-what-you-are-actually-paying-for',
            defaults={
                'title': 'Thermal breaks: what you are actually paying for',
                'excerpt': (
                    'Two aluminium windows can look identical in elevation and differ by forty per cent '
                    'in price. The difference is almost always in a part of the profile nobody sees — '
                    'and in what it costs you in sightline.'
                ),
                'content': SAMPLE_CONTENT,
                'takeaways': TAKEAWAYS,
                'category': categories['Performance'],
                'author': author,
                'show_author': True,
                'status': Post.STATUS_PUBLISHED,
                'is_featured': True,
                'comments_enabled': True,
                'published_at': timezone.now(),
                'focus_keyword': 'thermal break aluminium window',
                'meta_title': 'Thermal breaks in aluminium windows — what you pay for',
                'meta_description': (
                    'How a polyamide thermal break changes frame Uf from 5.5 to 1.6 W/m²K, what it '
                    'costs in sightline, and why condensation is the real test.'
                ),
                'image_alt': 'Cutaway of a thermally broken aluminium window profile',
            },
        )

        tags = []
        for name in ['Thermal Performance', 'Aluminium', 'Specification', 'Condensation', 'Sightlines']:
            tag, _ = Tag.objects.get_or_create(name=name)
            tags.append(tag)
        post.tags.set(tags)

        verb = 'Created' if created else 'Updated'
        self.stdout.write(self.style.SUCCESS(
            f'{verb} sample article "{post.title}" '
            f'({post.reading_time} min read, {len(post.takeaway_list)} takeaways) at /blog/{post.slug}'
        ))
