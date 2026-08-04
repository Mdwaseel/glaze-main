"""Allowlist sanitiser for post HTML.

The blog editor accepts raw HTML by design — that is the feature the brief
asked for. So the stored value has to be cleaned before it reaches a reader's
browser, because the React article page renders it with dangerouslySetInnerHTML
and has no way to tell safe markup from a <script>.

Preferred backend is nh3 (Rust `ammonia` bindings, the maintained successor to
bleach's cleaner). It parses with a real HTML5 tokenizer, which is what makes
it correct against the tricks that break naive filters: mutation XSS, mis-nested
tags that re-open after the filter has moved on, `<svg><style>` parsing-mode
switches, and so on.

The pure-stdlib fallback below runs only when nh3 is not installed. It is
deliberately much stricter — it drops anything it is not certain about rather
than trying to repair it — because a hand-rolled sanitiser that tries to be
clever is exactly the kind that gets bypassed. Install nh3.

Even with all this, post content is authored by authenticated staff. The
sanitiser is defence in depth against a compromised editor account or a
copy-pasted snippet, not the only thing standing between a visitor and XSS.
"""

import re
from html.parser import HTMLParser

try:
    import nh3
    HAS_NH3 = True
except ImportError:  # pragma: no cover - depends on the deployment
    HAS_NH3 = False


# Editorial markup an article legitimately needs, and nothing more. No <script>,
# no <style>, no <iframe>, no <form>, no <object>/<embed>.
ALLOWED_TAGS = {
    'p', 'br', 'hr', 'span', 'div',
    'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'q', 'cite',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    'code', 'pre', 'kbd', 'abbr', 'time',
}

ALLOWED_ATTRIBUTES = {
    '*': {'class', 'id', 'title', 'dir', 'lang'},
    # No 'rel' here on purpose. Both backends SET it rather than accept it:
    # nh3 via link_rel, the fallback by appending it in handle_starttag. nh3
    # rejects the combination outright, and letting an author supply their own
    # rel would let them strip the noopener off a target="_blank" link.
    'a': {'href', 'target'},
    'img': {'src', 'alt', 'width', 'height', 'loading', 'decoding'},
    'td': {'colspan', 'rowspan', 'headers'},
    'th': {'colspan', 'rowspan', 'scope', 'headers'},
    'col': {'span'},
    'colgroup': {'span'},
    'time': {'datetime'},
    'abbr': {'title'},
    'blockquote': {'cite'},
    'q': {'cite'},
}

# http/https/mailto/tel only. Notably absent: `javascript:` (script execution)
# and `data:` (a data:text/html URI in an href is a same-origin script vector).
ALLOWED_SCHEMES = {'http', 'https', 'mailto', 'tel'}

# The callout components the brief specifies, plus the utility classes the
# article stylesheet ships. Anything else is stripped so a pasted snippet
# cannot pull in styling that breaks the page layout.
ALLOWED_CLASS_PREFIXES = ('bl-',)
ALLOWED_CLASSES = {
    'bl-tip', 'bl-expert', 'bl-insight', 'bl-note', 'bl-warning',
    'bl-lead', 'bl-figure', 'bl-caption', 'bl-table', 'bl-spec',
}


def _clean_classes(value: str) -> str:
    keep = [
        name for name in value.split()
        if name in ALLOWED_CLASSES or name.startswith(ALLOWED_CLASS_PREFIXES)
    ]
    return ' '.join(keep)


def _safe_url(value: str) -> bool:
    value = (value or '').strip()
    if not value:
        return False
    # Relative and fragment URLs carry no scheme and are safe by construction.
    if value.startswith(('/', '#', './', '../')):
        return True
    match = re.match(r'^([a-zA-Z][a-zA-Z0-9+.\-]*):', value)
    if not match:
        return True
    return match.group(1).lower() in ALLOWED_SCHEMES


def _nh3_attribute_filter(tag: str, attribute: str, value: str):
    """Per-attribute pass, run by nh3 after its own tag/attribute allowlist.

    nh3 decides WHICH attributes survive; it does not inspect their values
    beyond URL schemes. Class filtering therefore has to happen here, or the
    nh3 path would keep any class an author pasted while the stdlib fallback
    stripped it — the two backends must agree, otherwise the protection
    silently depends on which one happens to be installed.

    Returning None drops the attribute.
    """
    if attribute == 'class':
        cleaned = _clean_classes(value)
        return cleaned or None
    return value


def _sanitize_nh3(html: str) -> str:
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes={tag: set(attrs) for tag, attrs in ALLOWED_ATTRIBUTES.items()},
        url_schemes=ALLOWED_SCHEMES,
        link_rel='noopener noreferrer',
        strip_comments=True,
        attribute_filter=_nh3_attribute_filter,
    )


class _Allowlist(HTMLParser):
    """Fallback sanitiser. Re-emits only what it recognises.

    Unknown tags are dropped but their TEXT is kept, matching how nh3 and
    bleach behave — removing a stray <font> should not silently delete the
    paragraph inside it.
    """

    VOID = {'br', 'hr', 'img', 'col'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        # Tracks tags we emitted, so a closing tag we never opened is discarded
        # instead of unbalancing the document.
        self.open_tags = []

    def handle_starttag(self, tag, attrs):
        if tag not in ALLOWED_TAGS:
            return

        kept = []
        permitted = ALLOWED_ATTRIBUTES.get('*', set()) | ALLOWED_ATTRIBUTES.get(tag, set())

        for name, value in attrs:
            name = name.lower()
            value = value or ''
            if name not in permitted:
                continue
            # Belt and braces: an on* handler should already have failed the
            # allowlist, but this makes the intent explicit.
            if name.startswith('on'):
                continue
            if name in ('href', 'src', 'cite') and not _safe_url(value):
                continue
            if name == 'class':
                value = _clean_classes(value)
                if not value:
                    continue
            kept.append(f'{name}="{self._escape_attr(value)}"')

        if tag == 'a':
            kept.append('rel="noopener noreferrer"')

        rendered = ' '.join(kept)
        self.out.append(f'<{tag}{" " + rendered if rendered else ""}>')

        if tag not in self.VOID:
            self.open_tags.append(tag)

    def handle_startendtag(self, tag, attrs):
        if tag in ALLOWED_TAGS:
            self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag in ALLOWED_TAGS and tag not in self.VOID and tag in self.open_tags:
            self.out.append(f'</{tag}>')
            self.open_tags.remove(tag)

    def handle_data(self, data):
        self.out.append(data.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))

    def handle_comment(self, data):
        pass  # comments are dropped: conditional comments are a script vector

    @staticmethod
    def _escape_attr(value):
        return (
            value.replace('&', '&amp;').replace('"', '&quot;')
            .replace('<', '&lt;').replace('>', '&gt;')
        )

    def result(self):
        # Close anything the author left open, innermost first.
        for tag in reversed(self.open_tags):
            self.out.append(f'</{tag}>')
        self.open_tags.clear()
        return ''.join(self.out)


def _sanitize_stdlib(html: str) -> str:
    parser = _Allowlist()
    parser.feed(html)
    parser.close()
    return parser.result()


def sanitize_html(html: str) -> str:
    """Return `html` with everything outside the allowlist removed."""
    if not html:
        return ''
    return _sanitize_nh3(html) if HAS_NH3 else _sanitize_stdlib(html)


_TAG_RE = re.compile(r'<[^>]+>')


def strip_tags_for_count(html: str) -> str:
    """Plain text, for the word count behind the reading-time estimate.

    Not a security boundary — never render this. A regex over tags is fine for
    counting words and wrong for producing safe output.
    """
    return _TAG_RE.sub(' ', html or '')
