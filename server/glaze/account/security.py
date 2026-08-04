"""Brute-force defence and the audit trail for the admin login.

Three questions this module answers:

  who is asking?      client_ip()
  are they allowed?   assert_not_locked()
  what happened?      register_failure() / register_success() / record_audit()

The lockout runs on two independent scopes at once:

  account  one email, MAX_ACCOUNT_FAILURES tries. Stops guessing at a known
           address.
  ip       one address across ALL emails, MAX_IP_FAILURES tries. Stops
           spraying — one common password tried against many accounts, where
           no single account ever accumulates enough failures to trip.

Neither alone is sufficient, which is why both are checked.

Lockouts back off exponentially and the strike count survives the lockout
expiring, so the attacker's cost doubles each round while a real owner who
mistypes twice and then gets it right has their record wiped clean.
"""

from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import AuditLog, LoginAttempt, LoginLockout


class LockedOut(Exception):
    """Raised when an account or IP is currently barred. Carries seconds remaining."""

    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__(f'Locked out for another {retry_after}s')


def client_ip(request) -> str:
    """The caller's address.

    X-Forwarded-For is honoured ONLY when ADMIN_LOGIN['TRUST_FORWARDED_FOR']
    is on, because any client can set that header themselves. Trusting it
    without a proxy that overwrites it means an attacker forges a new address
    on every request and the per-IP lockout counts to one forever.
    """
    if settings.ADMIN_LOGIN['TRUST_FORWARDED_FOR']:
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded:
            # Left-most entry is the original client; the rest are proxies.
            return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or '0.0.0.0'


def user_agent(request) -> str:
    return request.META.get('HTTP_USER_AGENT', '')[:400]


def _scopes(email: str, ip: str):
    return ((LoginLockout.SCOPE_ACCOUNT, email.lower()), (LoginLockout.SCOPE_IP, ip))


def assert_not_locked(email: str, ip: str) -> None:
    """Raise LockedOut if either scope is currently barred.

    Called BEFORE the password is checked, so a locked account costs an
    attacker a database read rather than an Argon2 verification — which also
    means the lockout doubles as protection against Argon2 being used as a
    CPU-exhaustion vector.
    """
    now = timezone.now()
    remaining = 0

    for scope, key in _scopes(email, ip):
        row = LoginLockout.objects.filter(scope=scope, key=key).first()
        if row and row.locked_until and row.locked_until > now:
            remaining = max(remaining, int((row.locked_until - now).total_seconds()))

    if remaining:
        raise LockedOut(remaining)


def _lockout_duration(strikes: int) -> int:
    conf = settings.ADMIN_LOGIN
    doubled = conf['LOCKOUT_SECONDS'] * (2 ** max(strikes - 1, 0))
    return min(doubled, conf['LOCKOUT_MAX_SECONDS'])


@transaction.atomic
def register_failure(request, email: str, reason: str = 'bad_credentials') -> None:
    """Record a failed attempt and lock the scope if it just crossed its threshold."""
    conf = settings.ADMIN_LOGIN
    ip = client_ip(request)
    email = (email or '').lower()

    LoginAttempt.objects.create(
        email=email[:254], ip_address=ip, successful=False,
        user_agent=user_agent(request), reason=reason,
    )

    window_start = timezone.now() - timedelta(seconds=conf['FAILURE_WINDOW_SECONDS'])
    thresholds = {
        LoginLockout.SCOPE_ACCOUNT: conf['MAX_ACCOUNT_FAILURES'],
        LoginLockout.SCOPE_IP: conf['MAX_IP_FAILURES'],
    }

    for scope, key in _scopes(email, ip):
        field = 'email' if scope == LoginLockout.SCOPE_ACCOUNT else 'ip_address'
        failures = LoginAttempt.objects.filter(
            successful=False, created_at__gte=window_start, **{field: key},
        ).count()

        if failures < thresholds[scope]:
            continue

        row, _ = LoginLockout.objects.select_for_update().get_or_create(scope=scope, key=key)
        row.strikes = F('strikes') + 1
        row.save(update_fields=['strikes'])
        row.refresh_from_db(fields=['strikes'])
        row.locked_until = timezone.now() + timedelta(seconds=_lockout_duration(row.strikes))
        row.save(update_fields=['locked_until'])


@transaction.atomic
def register_success(request, user) -> None:
    """Record a successful login and clear both lockout scopes.

    Wiping the row rather than zeroing it means the next failure starts from
    strike 1 again. That is the intent: the owner proved they hold the
    password, so the escalating penalty aimed at a guesser no longer applies.
    """
    ip = client_ip(request)
    email = user.email.lower()

    LoginAttempt.objects.create(
        email=email[:254], ip_address=ip, successful=True, user_agent=user_agent(request),
    )
    LoginLockout.objects.filter(scope=LoginLockout.SCOPE_ACCOUNT, key=email).delete()
    LoginLockout.objects.filter(scope=LoginLockout.SCOPE_IP, key=ip).delete()


def record_audit(request, action: str, target: str = '', **detail) -> AuditLog:
    """Append one entry to the privileged-action trail."""
    user = getattr(request, 'user', None)
    authenticated = bool(user and user.is_authenticated)

    return AuditLog.objects.create(
        actor=user if authenticated else None,
        actor_email=(user.email if authenticated else detail.pop('actor_email', ''))[:254],
        action=action,
        target=str(target)[:200],
        detail=detail,
        ip_address=client_ip(request),
    )
