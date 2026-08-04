"""Create or update the Studio administrator account.

    python manage.py bootstrap_admin
    python manage.py bootstrap_admin --email someone@example.com --password '...'

Idempotent: run it twice and the second run resets the password and re-asserts
staff/superuser rather than failing on a duplicate email. That is what makes it
usable as a "I am locked out, reset me" tool as well as a first-run bootstrap —
`createsuperuser` cannot do either, it just errors on an existing address.

Reads GLAZE_ADMIN_EMAIL / GLAZE_ADMIN_PASSWORD from the environment when the
flags are not given, so a deploy can seed an admin without the password ever
appearing in a shell command (and therefore in shell history).

The password is always run through AUTH_PASSWORD_VALIDATORS before it is
accepted. `createsuperuser --noinput` and `create_superuser()` both skip
validation entirely, which is how weak passwords get into production databases
unnoticed. Pass --skip-validation only if you have a deliberate reason.
"""

import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Create or update the Studio administrator account (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--email', default=os.environ.get('GLAZE_ADMIN_EMAIL'))
        parser.add_argument('--password', default=os.environ.get('GLAZE_ADMIN_PASSWORD'))
        parser.add_argument('--name', default='Glaze Administrator')
        parser.add_argument(
            '--skip-validation', action='store_true',
            help='Bypass AUTH_PASSWORD_VALIDATORS. Not recommended.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        email = (options['email'] or '').strip().lower()
        password = options['password']

        if not email:
            raise CommandError('An email is required (--email or GLAZE_ADMIN_EMAIL).')
        if not password:
            raise CommandError('A password is required (--password or GLAZE_ADMIN_PASSWORD).')

        email = User.objects.normalize_email(email)

        if not options['skip_validation']:
            probe = User(email=email, full_name=options['name'])
            try:
                validate_password(password, probe)
            except ValidationError as exc:
                raise CommandError(
                    'Password rejected:\n  ' + '\n  '.join(exc.messages)
                )

        user = User.objects.filter(email__iexact=email).first()

        if user is None:
            user = User.objects.create_superuser(
                email=email, password=password, full_name=options['name'],
            )
            action = 'Created'
        else:
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            if options['name']:
                user.full_name = options['name']
            user.save()
            action = 'Updated'

        # Any lockout against this address is cleared. Resetting the password of
        # an account someone has been guessing at, only to leave it barred for
        # another hour, would be a confusing way to hand back access.
        from account.models import LoginLockout
        cleared, _ = LoginLockout.objects.filter(
            scope=LoginLockout.SCOPE_ACCOUNT, key=email,
        ).delete()

        self.stdout.write(self.style.SUCCESS(
            f'{action} administrator {user.email}\n'
            f'  staff={user.is_staff} superuser={user.is_superuser} active={user.is_active}\n'
            f'  hash={user.password.split("$")[0]}'
            + (f'\n  cleared {cleared} lockout record(s)' if cleared else '')
        ))
        self.stdout.write(
            'Sign in at /admin/login on the React app '
            '(NOT /django-admin/, which is the raw Django admin).'
        )
