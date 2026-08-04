"""Conversational intents — the things people say that are not questions.

WHY THIS EXISTS. Retrieval-only assistants fail their very first message.
Measured against this corpus before this module: "hi", "hello", "thanks",
"bye", "ok", "who are you?" and "can you help me?" all scored zero on lexical
search and were routed to the contact page. A visitor whose opening "hi" is
answered with "I couldn't find anything covering that, please use the contact
form" closes the panel and does not come back.

These are handled BEFORE retrieval and never reach the model:

  - the answer is fixed, so it cannot drift or hallucinate
  - it costs no provider call and no latency
  - it cannot be deflected by a coverage gate that was never meant to judge
    the word "thanks"

GREETING + QUESTION IS NOT A GREETING. "hi, what U-value do you get?" must be
answered, not greeted. So a match only short-circuits when nothing substantive
is left after the greeting is stripped — otherwise the greeting is removed and
the remainder goes to retrieval as normal.
"""

import re

# Stripped before matching so "hello!!!" and "hello" are the same input.
_PUNCT = re.compile(r'[^\w\s]+')
_SPACE = re.compile(r'\s+')


def normalise(text: str) -> str:
    return _SPACE.sub(' ', _PUNCT.sub(' ', (text or '').lower())).strip()


# ── Intent patterns ───────────────────────────────────────────────────
# Anchored whole-phrase alternatives. Deliberately NOT substring matching:
# "hi" appears inside "which", "high" and "this", and a substring match would
# greet someone asking "which is the highest U-value".

GREETING = r'(?:hi|hii+|hey+|hello+|helo|yo|hiya|howdy|namaste|hola|sup|greetings|good\s+(?:morning|afternoon|evening|day))'
THANKS = r'(?:thanks?|thank\s+you|thx|ty|cheers|much\s+appreciated|appreciate\s+it|brilliant|perfect)'
BYE = r'(?:bye+|goodbye|see\s+ya|see\s+you|later|cya|that\s+is\s+all|thats\s+all|nothing\s+else|im\s+done|no\s+thanks|no\s+thank\s+you)'
AFFIRM = r'(?:ok|okay|okey|k|cool|nice|great|good|got\s+it|understood|sure|fine|alright|right|yeah|yep|yes|makes\s+sense|awesome|lovely)'
IDENTITY = r'(?:who\s+(?:are|r)\s+(?:you|u)|what\s+are\s+you|are\s+you\s+(?:a\s+)?(?:bot|robot|human|real|person|ai)|your\s+name|whats\s+your\s+name)'
CAPABILITY = r'(?:what\s+can\s+you\s+do|how\s+can\s+you\s+help|can\s+you\s+help(?:\s+me)?|what\s+do\s+you\s+(?:know|do)|help(?:\s+me)?|how\s+does\s+this\s+work|what\s+is\s+this)'
WELLBEING = r'(?:how\s+are\s+you|how\s+are\s+(?:things|you\s+doing)|hows\s+it\s+going|whats\s+up)'


def _rx(body: str) -> re.Pattern:
    return re.compile(rf'^{body}$')


# Order matters: the first match wins, so the more specific phrasings
# (identity, capability) are tested before the loose ones (affirm).
_EXACT = [
    ('identity', _rx(IDENTITY)),
    ('capability', _rx(CAPABILITY)),
    ('wellbeing', _rx(WELLBEING)),
    ('thanks', _rx(rf'{THANKS}(?:\s+(?:so\s+)?much)?')),
    ('bye', _rx(BYE)),
    ('greeting', _rx(rf'{GREETING}(?:\s+there)?')),
    ('affirm', _rx(AFFIRM)),
]

# Leading pleasantries to peel off a real question: "hi, what u value…".
_LEADING = re.compile(rf'^(?:{GREETING}|{THANKS})(?:\s+there)?[\s,!.]*', re.I)


RESPONSES = {
    'greeting': (
        "Hello. I can tell you about our window and door systems — sizes, "
        "performance figures, glass, hardware and finishes. What are you looking at?"
    ),
    'thanks': (
        "You're welcome. Anything else about the systems, or shall I point you "
        "to the team?"
    ),
    'bye': (
        "Thanks for stopping by. If you'd like a quotation or a showroom visit, "
        "the contact page is the quickest route to the team."
    ),
    'affirm': "Anything else you'd like to know about the systems?",
    'identity': (
        "I'm the assistant on the Glaze website — an automated one, not a person. "
        "I answer from what's published here about our systems, and I'll hand you "
        "to the team for anything I can't cover."
    ),
    'capability': (
        "I can cover our six systems — sliding, casement, lift & slide, bi-fold, "
        "pivot and fixed — plus the series specifications, U-values and acoustic "
        "ratings, glass, hardware, finishes, and how to reach us. Ask away."
    ),
    'wellbeing': (
        "Doing well, thank you. What can I tell you about the systems?"
    ),
}

# `bye` gets the contact card: it is the one intent where pointing at the team
# is the helpful thing to do rather than a failure to answer.
SHOWS_CONTACT = {'bye'}


def detect(question: str):
    """Classify a conversational message.

    Returns (intent, remainder):
      intent    the matched name, or None
      remainder the substantive question left after stripping a leading
                pleasantry — '' when the whole message was the pleasantry

    Only messages of six words or fewer are considered for a whole-message
    match. Beyond that the person is asking something, however chattily, and
    the retriever should see it.
    """
    text = normalise(question)
    if not text:
        return None, ''

    if len(text.split()) <= 6:
        for name, pattern in _EXACT:
            if pattern.match(text):
                return name, ''

    # ⚠ THE REMAINDER IS CUT FROM THE ORIGINAL, NEVER FROM `text`.
    #
    # `text` is normalised — punctuation stripped — and that form is fit only
    # for MATCHING. Returning it corrupted every question that reached
    # retrieval: "What U-value does the GWS-N1-60H achieve?" arrived as
    # "what u value does the gws n1 60h achieve", so the hyphenated tokens the
    # tsvector actually indexes no longer existed and the question was refused
    # despite the passage being right there. Normalise to compare; return what
    # the visitor typed.
    stripped = _LEADING.sub('', question.lstrip(), count=1).lstrip(' ,!.\t')
    if stripped and stripped != question.strip():
        return None, stripped

    return None, question
