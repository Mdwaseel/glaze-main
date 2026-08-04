"""Give the enquiries that already exist the category they would get today.

Without this every historic row reads "General", because that is the field's
default — which would make the new filter in the inbox useless for exactly the
enquiries an operator is most likely to go looking for, and would misrepresent
where they actually came from.

The rule is the one in Enquiry.categorise, written out rather than imported:
a migration has to keep working against the schema it was written for, and
importing application code means a later edit to that function silently
changes what this migration did.
"""

from django.db import migrations


def backfill(apps, schema_editor):
    Enquiry = apps.get_model('siteconfig', 'Enquiry')

    Enquiry.objects.filter(source_path__istartswith='/products/').update(category='product')
    Enquiry.objects.filter(source_path__istartswith='/contact').update(category='contact')
    # Everything else keeps the 'general' default the column was added with.


def unbackfill(apps, schema_editor):
    # Reversible, and it has to put back exactly what the schema migration
    # would have left: the column default.
    Enquiry = apps.get_model('siteconfig', 'Enquiry')
    Enquiry.objects.all().update(category='general')


class Migration(migrations.Migration):

    dependencies = [
        ('siteconfig', '0002_contactsettings_contact_recipient_emails_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, unbackfill),
    ]
