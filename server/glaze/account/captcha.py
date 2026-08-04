"""Captcha for the admin login.

Two providers, chosen by CAPTCHA['PROVIDER']:

  internal   (default) a stateless, self-hosted challenge — no third-party
             account, no visitor data leaving the box, works offline.
  recaptcha
  hcaptcha   hosted providers, verified server-side against their siteverify
  turnstile  endpoint. Set CAPTCHA_SECRET_KEY / CAPTCHA_SITE_KEY to use one.


THE INTERNAL CHALLENGE
──────────────────────
No server-side session, no cache entry, no row written at issue time. The
challenge travels to the browser as a signed token and comes back with the
answer typed beside it:

    token = b64url(payload_json) "." b64url(HMAC-SHA256(K_sig, payload_json))
    payload = {"h": answer_mac, "n": nonce, "e": expiry_unix}
    answer_mac = HMAC-SHA256(K_ans, normalise(answer) || nonce)

Three properties, each load-bearing:

1. The plaintext answer is never in the token. Only a MAC of it is, so a
   client that reads its own token still cannot see what to type.

2. That MAC is KEYED, and this is the part that is easy to get wrong. A bare
   SHA-256 of a 5-character answer would be broken instantly — the whole
   answer space is 32^5 ≈ 33 million, which a laptop enumerates in seconds.
   Because K_ans is a server secret the attacker does not hold, there are no
   candidate digests to enumerate at all.

3. The payload is signed, so expiry and nonce cannot be edited. Without the
   signature a client could push "e" forward forever and mint one solved
   challenge into an unlimited-use pass.

The two keys are derived separately from SECRET_KEY via HKDF-style salted
hashing, so the signing key and the answer key are never the same value —
signing oracles and answer MACs stay in different domains.

Single use is the one thing statelessness cannot give us, so it is the one
thing that touches the database: a solved nonce is burned into CaptchaNonce
under a unique constraint. Replaying a captured token loses the race and is
rejected. Rows are pruned opportunistically as they expire.

Every comparison uses compare_digest. A plain `==` on a MAC leaks its prefix
through timing, which is enough to forge one byte at a time.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone


class CaptchaError(Exception):
    """Raised when a challenge is missing, malformed, expired, reused or wrong."""


# ── Key derivation ────────────────────────────────────────────────────────
# Distinct salts, so the signing key cannot be used as the answer key or the
# other way round even though both descend from SECRET_KEY.

def _derive_key(purpose: str) -> bytes:
    return hashlib.sha256(f'glaze.captcha.{purpose}:'.encode() + settings.SECRET_KEY.encode()).digest()


def _sig_key() -> bytes:
    return _derive_key('signature')


def _answer_key() -> bytes:
    return _derive_key('answer')


# ── Alphabet ──────────────────────────────────────────────────────────────
# 0/O, 1/I/L and 5/S are omitted: they are the characters people misread, and
# a captcha that rejects a human who read it correctly is a broken captcha.
ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ2346789'


def _normalise(answer: str) -> bytes:
    """Case- and space-insensitive. Only the glyphs matter, not how they were typed."""
    return ''.join(str(answer).split()).upper().encode()


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip('=')


def _b64d(text: str) -> bytes:
    padding = '=' * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def _answer_mac(answer: str, nonce: str) -> bytes:
    return hmac.new(_answer_key(), _normalise(answer) + nonce.encode(), hashlib.sha256).digest()


def _sign(payload: bytes) -> bytes:
    return hmac.new(_sig_key(), payload, hashlib.sha256).digest()


# ── Issue ─────────────────────────────────────────────────────────────────

def issue() -> dict:
    """Mint a fresh challenge. Returns the token, its SVG and when it expires."""
    conf = settings.CAPTCHA
    text = ''.join(secrets.choice(ALPHABET) for _ in range(conf['LENGTH']))
    nonce = secrets.token_urlsafe(16)
    expires_at = int(time.time()) + conf['TTL_SECONDS']

    payload = json.dumps(
        {'h': _answer_mac(text, nonce).hex(), 'n': nonce, 'e': expires_at},
        separators=(',', ':'),
        sort_keys=True,
    ).encode()

    token = f'{_b64e(payload)}.{_b64e(_sign(payload))}'
    return {
        'token': token,
        'image': render_svg(text),
        'expires_in': conf['TTL_SECONDS'],
    }


# ── Verify ────────────────────────────────────────────────────────────────

def verify_internal(token: str, answer: str) -> None:
    """Raise CaptchaError unless `answer` solves `token`. Burns the nonce on success."""
    if not token or not answer:
        raise CaptchaError('Captcha is required.')

    try:
        raw_payload, raw_sig = str(token).split('.', 1)
        payload = _b64d(raw_payload)
        signature = _b64d(raw_sig)
    except (ValueError, TypeError, base64.binascii.Error):
        raise CaptchaError('Captcha challenge is malformed.')

    # Signature first: nothing inside the payload is trustworthy until the MAC
    # over it checks out, so expiry and nonce are not even read before this.
    if not hmac.compare_digest(signature, _sign(payload)):
        raise CaptchaError('Captcha challenge is malformed.')

    try:
        data = json.loads(payload)
        expected_mac = bytes.fromhex(data['h'])
        nonce = str(data['n'])
        expires_at = int(data['e'])
    except (ValueError, KeyError, TypeError):
        raise CaptchaError('Captcha challenge is malformed.')

    if time.time() > expires_at:
        raise CaptchaError('Captcha expired. Please try the new one.')

    if not hmac.compare_digest(expected_mac, _answer_mac(answer, nonce)):
        raise CaptchaError('Captcha answer is incorrect.')

    _burn(nonce, expires_at)


def _burn(nonce: str, expires_at: int) -> None:
    """Record the nonce so this challenge cannot be solved twice.

    Deliberately the last step: a wrong answer must not consume the challenge,
    or a bot could grief a real user by spamming wrong answers against a token
    it scraped. The unique constraint is what actually enforces single use —
    checking "does it exist?" first and inserting after would leave a window
    where two concurrent replays both pass.
    """
    from .models import CaptchaNonce

    # Opportunistic prune. Cheap, indexed, and keeps the table from growing
    # without needing a cron job for what is a handful of rows a day.
    CaptchaNonce.objects.filter(expires_at__lt=timezone.now()).delete()

    try:
        with transaction.atomic():
            CaptchaNonce.objects.create(
                nonce=nonce,
                expires_at=timezone.datetime.fromtimestamp(expires_at, tz=timezone.get_current_timezone()),
            )
    except IntegrityError:
        raise CaptchaError('This captcha has already been used.')


# ── Hosted providers ──────────────────────────────────────────────────────

_VERIFY_URLS = {
    'recaptcha': 'https://www.google.com/recaptcha/api/siteverify',
    'hcaptcha': 'https://api.hcaptcha.com/siteverify',
    'turnstile': 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
}


def verify_hosted(provider: str, response_token: str, remote_ip: str | None = None) -> None:
    import requests

    secret = settings.CAPTCHA['SECRET_KEY']
    if not secret:
        # Failing closed matters here. If a misconfigured secret silently
        # skipped verification, the login page would look protected while
        # accepting anything.
        raise CaptchaError('Captcha is not configured on the server.')
    if not response_token:
        raise CaptchaError('Captcha is required.')

    payload = {'secret': secret, 'response': response_token}
    if remote_ip:
        payload['remoteip'] = remote_ip

    try:
        result = requests.post(_VERIFY_URLS[provider], data=payload, timeout=8).json()
    except Exception:
        raise CaptchaError('Could not reach the captcha service. Please retry.')

    if not result.get('success'):
        raise CaptchaError('Captcha verification failed.')


def verify(data: dict, remote_ip: str | None = None) -> None:
    """Front door. Dispatches on the configured provider."""
    provider = settings.CAPTCHA['PROVIDER']
    if provider == 'internal':
        verify_internal(data.get('captcha_token', ''), data.get('captcha_answer', ''))
    elif provider in _VERIFY_URLS:
        verify_hosted(provider, data.get('captcha_response', ''), remote_ip)
    else:
        raise CaptchaError(f'Unknown captcha provider: {provider}')


# ── SVG rendering ─────────────────────────────────────────────────────────

_ESCAPE = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}


def _esc(text: str) -> str:
    return ''.join(_ESCAPE.get(ch, ch) for ch in text)


def render_svg(text: str, width: int = 200, height: int = 64) -> str:
    """Draw the challenge as an inline SVG in the house palette.

    SVG rather than a PNG so there is no Pillow dependency on the login path
    and the mark stays crisp on a high-DPI screen. Every character gets its own
    rotation, vertical offset and size, and four bezier strokes cross the glyphs
    — enough to defeat naive OCR without making it a puzzle for a person.

    secrets.choice, not random, for the jitter too. The distortion is not a
    secret, but the module has one source of randomness and mixing a predictable
    one in invites someone later to reach for the wrong one.
    """
    step = (width - 30) / max(len(text), 1)
    glyphs = []

    for index, char in enumerate(text):
        x = 18 + index * step + secrets.randbelow(7) - 3
        y = height / 2 + 11 + secrets.randbelow(11) - 5
        rotation = secrets.randbelow(41) - 20
        size = 30 + secrets.randbelow(7)
        shade = ['#1B1B1B', '#726655', '#4A4136'][secrets.randbelow(3)]
        glyphs.append(
            f'<text x="{x:.1f}" y="{y:.1f}" font-family="Georgia,serif" '
            f'font-size="{size}" font-weight="600" fill="{shade}" '
            f'transform="rotate({rotation} {x:.1f} {y:.1f})">{_esc(char)}</text>'
        )

    strokes = []
    for _ in range(4):
        points = [secrets.randbelow(height) for _ in range(3)]
        strokes.append(
            f'<path d="M0 {points[0]} Q {width // 3} {points[1]} {width} {points[2]}" '
            f'stroke="#726655" stroke-opacity="0.35" stroke-width="1.5" fill="none"/>'
        )

    dots = ''.join(
        f'<circle cx="{secrets.randbelow(width)}" cy="{secrets.randbelow(height)}" '
        f'r="1" fill="#726655" fill-opacity="0.35"/>'
        for _ in range(28)
    )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-label="Captcha challenge">'
        f'<rect width="{width}" height="{height}" fill="#F5F5F3"/>'
        f'{dots}{"".join(strokes)}{"".join(glyphs)}'
        f'</svg>'
    )
