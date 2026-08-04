import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """Email-authenticated user."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=150, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'account_user'
        verbose_name = 'user'
        verbose_name_plural = 'users'
        ordering = ('-date_joined',)

    def __str__(self):
        return self.email

    def get_full_name(self):
        return self.full_name or self.email

    def get_short_name(self):
        return self.full_name.split(' ')[0] if self.full_name else self.email


class CaptchaNonce(models.Model):
    """A solved captcha, burned so the same token cannot be replayed.

    The internal captcha is otherwise stateless — this table is the single
    piece of state, and it exists only because "single use" is the one
    property a signed token cannot carry on its own. The unique constraint,
    not application code, is what enforces it: a check-then-insert would let
    two concurrent replays of the same token both pass.
    """

    nonce = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        db_table = 'account_captcha_nonce'
        verbose_name = 'captcha nonce'
        verbose_name_plural = 'captcha nonces'

    def __str__(self):
        return f'{self.nonce[:12]}… until {self.expires_at:%Y-%m-%d %H:%M}'


class LoginAttempt(models.Model):
    """Every admin login try, successful or not.

    Failures are recorded against the SUBMITTED email even when no such
    account exists. Skipping those would turn the lockout into an account
    oracle: an unknown address would take unlimited guesses while a real one
    locked after five.
    """

    email = models.CharField(max_length=254, db_index=True)
    ip_address = models.GenericIPAddressField(db_index=True)
    successful = models.BooleanField(default=False)
    user_agent = models.CharField(max_length=400, blank=True)
    reason = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'account_login_attempt'
        ordering = ('-created_at',)
        indexes = [models.Index(fields=['email', 'created_at'])]

    def __str__(self):
        return f'{"OK" if self.successful else "FAIL"} {self.email} from {self.ip_address}'


class LoginLockout(models.Model):
    """Current lockout state for one account or one IP.

    `strikes` counts CONSECUTIVE lockouts and never resets on its own, which
    is what makes the backoff bite: 5 min, then 10, 20, 40 … up to the cap.
    A patient attacker pacing themselves under the rate throttle still runs
    into a doubling wall. A successful login clears the row entirely.
    """

    SCOPE_ACCOUNT = 'account'
    SCOPE_IP = 'ip'
    SCOPE_CHOICES = [(SCOPE_ACCOUNT, 'Account'), (SCOPE_IP, 'IP address')]

    scope = models.CharField(max_length=16, choices=SCOPE_CHOICES)
    key = models.CharField(max_length=254)
    strikes = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'account_login_lockout'
        constraints = [
            models.UniqueConstraint(fields=['scope', 'key'], name='uniq_lockout_scope_key'),
        ]

    def __str__(self):
        return f'{self.scope}:{self.key} until {self.locked_until}'


class AuditLog(models.Model):
    """Append-only trail of privileged actions.

    Anything that changes what the public site says — publishing a post,
    rewriting the auto-reply email, changing the phone number — lands here
    with who did it and from where. There is no update or delete path in the
    API; the admin registers it read-only.
    """

    actor = models.ForeignKey(
        'account.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_entries',
    )
    actor_email = models.CharField(max_length=254, blank=True)
    action = models.CharField(max_length=64, db_index=True)
    target = models.CharField(max_length=200, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'account_audit_log'
        ordering = ('-created_at',)
        verbose_name = 'audit log entry'
        verbose_name_plural = 'audit log'

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} {self.actor_email} {self.action} {self.target}'
