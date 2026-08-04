"""The language model layer: a provider chain, and what to do when it fails.

PROVIDERS. Groq and Cerebras are both OpenAI-compatible, so one client speaks
to either and settings.CHAT_PROVIDER_CHAIN decides the order. Groq leads
because it is the account with usable credit.

⚠ THE CEREBRAS KEY AUTHENTICATES BUT ITS ACCOUNT HAS NO CREDIT.
Verified three ways — raw request with our payload, raw request with the
vendor's own minimal example, and the official @cerebras/cerebras_cloud_sdk
verbatim — all return 402 `payment_required`. The control run proves the key
itself is fine: a bogus key returns 401 `wrong_api_key`, this one returns 200
on /v1/models. Enabling credit on that account is all that is needed; no code
changes. Until then it costs one fast 402 before the chain moves to Groq, and
it can be removed from CHAT_PROVIDER_CHAIN to skip even that.

ANSWER MODES, in descending order of polish:

  llm         Retrieval + a provider composes a fluent answer from the
              passages. The normal path.

  extractive  Retrieval succeeded, every provider failed. The best-matching
              sentences from the site are returned verbatim with the source
              link. Less conversational, still correct, still grounded — and
              impossible to hallucinate from, because nothing is generated.

  deflect     Retrieval found nothing above threshold. The visitor is sent to
              the contact page. No model call is made at all — that decision
              belongs to retrieval, and routing it through an LLM would only
              add a chance of it being talked out of.

The fallback is not merely insurance against the billing state. An assistant
on a marketing site that hard-fails during a vendor outage is worse than one
that answers a little more stiffly.
"""

import logging
import re
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

MODE_LLM = 'llm'
MODE_EXTRACTIVE = 'extractive'
MODE_DEFLECT = 'deflect'


class LLMUnavailable(Exception):
    """Cerebras could not answer. Carries a machine-readable reason.

    `reason` is logged and surfaced to staff in the admin conversation view,
    never to the visitor — "your Cerebras account needs billing" is not a
    sentence a prospective customer should ever read.
    """

    def __init__(self, reason: str, detail: str = ''):
        self.reason = reason
        self.detail = detail
        super().__init__(f'{reason}: {detail}'.strip(': '))


SYSTEM_PROMPT = """You are the assistant on the Glaze Window Systems website. \
Glaze designs, fabricates and installs premium aluminium window and door systems in Hyderabad, India.

You answer ONLY from the CONTEXT passages provided below. They are extracts from this company's own website.

Rules, in order of importance:
1. Never state a fact that is not in the CONTEXT. No outside knowledge about \
windows, glazing, competitors, prices or standards — even if you are confident it is true.
2. If the CONTEXT does not contain the answer, say so plainly in one sentence \
and tell the visitor the team can help directly through the contact page. Do not guess or approximate.
3. Never invent numbers. U-values, weights, spans, dB ratings and Pa figures \
must be quoted exactly as they appear in the CONTEXT or not at all.
4. Never quote a price. Pricing is always project-specific; direct pricing \
questions to the contact page.
5. Be brief — two or three short sentences for most questions. This is a chat \
window, not a brochure. Use a short list only when comparing several systems.
6. Write in plain British English, warm but unfussy. No emoji, no exclamation \
marks, no "Great question!". Do not open by restating the question.
7. Refer to the company as "Glaze" or "we".
8. NEVER mention the CONTEXT, the passages, the documents, "the information \
provided" or "my knowledge base". The visitor cannot see any of that and \
referring to it is confusing. Say "we don't publish that" or "I don't have \
that detail" — speak as the company, not as a system reading a file."""


def available_providers():
    """Chain entries that are actually usable — named in the chain, known, keyed."""
    out = []
    for name in settings.CHAT_PROVIDER_CHAIN:
        conf = settings.CHAT_PROVIDERS.get(name)
        if conf and conf['API_KEY']:
            out.append((name, conf))
    return out


def is_configured() -> bool:
    return bool(available_providers())


def build_messages(question: str, context: str, history=None):
    """Assemble the request.

    Context goes in a SYSTEM message, not a user one. A user-role passage is
    materially easier to talk the model out of — "ignore the text above" is a
    plausible user turn and an implausible system instruction.
    """
    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'system', 'content': f'CONTEXT (the only facts you may use):\n\n{context}'},
    ]

    # A short window only. Earlier turns help with "and what about pivot?",
    # but a long tail lets an earlier hallucination become the model's own
    # cited precedent, and it burns context on a small budget.
    for turn in (history or [])[-4:]:
        if turn.get('role') in ('user', 'assistant') and turn.get('content'):
            messages.append({'role': turn['role'], 'content': turn['content'][:1200]})

    messages.append({'role': 'user', 'content': question})
    return messages


def call_provider(name: str, conf: dict, question: str, context: str, history=None) -> str:
    """One provider, one attempt. Raises LLMUnavailable on any failure."""
    tuning = settings.CHAT_LLM

    payload = {
        'model': conf['MODEL'],
        'messages': build_messages(question, context, history),
        # Low but not zero. At 0 the model reads as clipped and repeats stock
        # phrasings across answers; this keeps it grounded but not robotic.
        'temperature': 0.2,
        'top_p': 0.9,
        'max_tokens': tuning['MAX_TOKENS'],
        'stream': False,
    }

    try:
        response = requests.post(
            conf['BASE_URL'].rstrip('/') + '/chat/completions',
            headers={
                'Authorization': f'Bearer {conf["API_KEY"]}',
                'Content-Type': 'application/json',
            },
            json=payload,
            timeout=tuning['TIMEOUT_SECONDS'],
        )
    except requests.Timeout:
        raise LLMUnavailable('timeout', f'{name}: no response in {tuning["TIMEOUT_SECONDS"]}s')
    except requests.RequestException as exc:
        raise LLMUnavailable('network', f'{name}: {str(exc)[:180]}')

    # Distinct reasons, because they need different human responses: billing,
    # a bad key, and a rate limit are three different Monday mornings.
    if response.status_code == 402:
        raise LLMUnavailable('payment_required', f'{name} account has no credit')
    if response.status_code in (401, 403):
        raise LLMUnavailable('auth', f'{name} rejected the API key')
    if response.status_code == 429:
        raise LLMUnavailable('rate_limited', f'{name} rate limit reached')
    if response.status_code >= 400:
        raise LLMUnavailable('http_error', f'{name}: {response.status_code} {response.text[:140]}')

    try:
        text = response.json()['choices'][0]['message']['content'].strip()
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise LLMUnavailable('bad_response', f'{name}: {type(exc).__name__} {str(exc)[:110]}')

    if not text:
        raise LLMUnavailable('empty', f'{name} returned no content')

    return scrub(text)


# Belt and braces for prompt rule 8. Models leak the scaffolding vocabulary
# occasionally however firmly they are told not to, and "the CONTEXT does not
# mention bulletproof glass" is not a sentence a customer should ever read.
# Rewriting beats re-prompting here: it is deterministic and costs nothing.
_LEAKS = [
    (re.compile(r'\bthe (CONTEXT|context)\b'), 'our published information'),
    (re.compile(r'\b(?:the )?(?:provided|given|supplied) (?:context|information|passages?|documents?|text)\b', re.I),
     'our published information'),
    (re.compile(r'\b(?:the )?(?:context|passages?|documents?) (?:provided|given|supplied|above|below)\b', re.I),
     'our published information'),
    (re.compile(r'\bmy knowledge base\b', re.I), 'our website'),
    (re.compile(r'\baccording to the (?:context|passages?|documents?)\b', re.I), 'from what we publish'),
]


def scrub(text: str) -> str:
    for pattern, replacement in _LEAKS:
        text = pattern.sub(replacement, text)
    # Collapse any double spaces the substitutions leave behind.
    return re.sub(r'  +', ' ', text).strip()


def complete(question: str, context: str, history=None):
    """Walk the provider chain. Returns (text, provider_name).

    Raises LLMUnavailable carrying the LAST failure once every provider has
    been tried. Each failure is logged individually so a chain that is
    silently limping along on its second choice is visible in the logs rather
    than only showing up as a bill.
    """
    providers = available_providers()
    if not providers:
        raise LLMUnavailable('not_configured', 'no provider in CHAT_PROVIDER_CHAIN has an API key')

    last = None
    for name, conf in providers:
        try:
            return call_provider(name, conf, question, context, history), name
        except LLMUnavailable as exc:
            last = exc
            logger.warning('chat provider %s failed (%s): %s', name, exc.reason, exc.detail)

    raise last


# ── Extractive fallback ───────────────────────────────────────────────

_SENTENCE_SPLIT = re.compile(r'(?<=[.!?])\s+')
_WORD = re.compile(r"[a-z0-9][a-z0-9'\-]*")
# Ignored when scoring overlap — they match everything and rank nothing.
_STOP = {
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does',
    'did', 'what', 'which', 'who', 'how', 'why', 'when', 'where', 'can', 'i',
    'you', 'we', 'it', 'to', 'of', 'for', 'in', 'on', 'at', 'and', 'or', 'my',
    'your', 'me', 'with', 'about', 'from', 'have', 'has', 'that', 'this',
    'there', 'their', 'they', 'would', 'could', 'should', 'please', 'tell',
}


def _terms(text: str) -> set:
    return {w for w in _WORD.findall(text.lower()) if w not in _STOP and len(w) > 2}


def extractive_answer(question: str, retrieved) -> str:
    """Compose an answer from the site's own sentences, generating nothing.

    Picks the sentences with the most overlap with the question, keeps them
    in their original order so the result still reads as prose, and caps the
    length so a chat bubble does not become an essay.

    Because every word is lifted verbatim from a retrieved passage, this
    cannot hallucinate — the failure mode is a slightly awkward answer, not a
    wrong one.
    """
    wanted = _terms(question)
    scored = []
    # Sibling chunks share whole sentences by construction — every system
    # chunk ends with a "Key figures — …" line built from the same template,
    # so without this the answer repeats itself verbatim. Normalised on case
    # and whitespace so near-identical lines collapse too.
    seen = set()

    for rank, chunk in enumerate(retrieved.chunks[:2]):
        for position, sentence in enumerate(_SENTENCE_SPLIT.split(chunk.body)):
            sentence = sentence.strip()
            if len(sentence) < 30:
                continue

            fingerprint = ' '.join(sentence.lower().split())
            if fingerprint in seen:
                continue
            seen.add(fingerprint)

            overlap = len(wanted & _terms(sentence))
            if not overlap:
                continue
            # Normalise by length so a long sentence does not win purely by
            # containing more words, and favour earlier chunks.
            density = overlap / (len(_terms(sentence)) ** 0.5 or 1)
            scored.append((density - rank * 0.15, rank, position, sentence))

    if not scored:
        # Nothing overlapped, but retrieval was confident — lead with the
        # opening of the best passage rather than returning nothing.
        lead = _SENTENCE_SPLIT.split(retrieved.chunks[0].body)[0].strip()
        return lead[:400]

    scored.sort(key=lambda x: -x[0])
    chosen = sorted(scored[:3], key=lambda x: (x[1], x[2]))

    out, total = [], 0
    for _, _, _, sentence in chosen:
        if total + len(sentence) > 520:
            break
        out.append(sentence)
        total += len(sentence)

    return ' '.join(out) or scored[0][3][:400]


def answer(question: str, retrieved, history=None) -> dict:
    """Produce the reply. Never raises — every failure has a defined answer."""
    started = time.monotonic()

    if not retrieved.confident:
        return {
            'text': '',              # the view supplies the deflection copy
            'mode': MODE_DEFLECT,
            'error': '',
            'latency_ms': 0,
        }

    context = retrieved.as_context()

    try:
        text, provider = complete(question, context, history)
        return {
            'text': text,
            'mode': MODE_LLM,
            'provider': provider,
            'error': '',
            'latency_ms': int((time.monotonic() - started) * 1000),
        }
    except LLMUnavailable as exc:
        # Warning, not error: this is a handled degradation with a working
        # fallback, and paging someone at 3am for it would be wrong.
        logger.warning('every chat provider failed (last: %s %s) — extractive fallback',
                       exc.reason, exc.detail)
        return {
            'text': extractive_answer(question, retrieved),
            'mode': MODE_EXTRACTIVE,
            'provider': '',
            'error': exc.reason,
            'latency_ms': int((time.monotonic() - started) * 1000),
        }
