"""Finding the passages that can answer a question — and deciding when none can.

The decision this module makes is more important than the ranking. Getting
"I don't know, here is the contact page" right is the entire brief: an
assistant that invents a U-value damages more trust than one that admits a
gap. So the threshold is deliberately set to refuse a borderline match rather
than pass thin context to the model and hope the prompt holds.

Two signals, combined:

  ts_rank_cd  lexical relevance over the weighted tsvector. Handles the
              precise domain vocabulary — "Rw", "600 Pa", "GWS-N1-60H".
              `_cd` rather than `ts_rank` because it accounts for term
              proximity: a chunk where "water" and "tightness" are adjacent
              should beat one where they are paragraphs apart.

  similarity  pg_trgm over title + keywords. This is the typo net. A visitor
              typing "casment windos" produces a tsquery that matches
              literally nothing, and without trigram they get deflected to
              the contact page for a question the site answers perfectly.
"""

import re
from dataclasses import dataclass
from difflib import get_close_matches
from functools import reduce
from operator import or_ as or_operator

from django.contrib.postgres.search import (
    SearchQuery,
    SearchRank,
    TrigramWordSimilarity,
)
from django.db.models import Count, F, FloatField, Q, Value
from django.db.models.functions import Greatest

from . import vocabulary
from .models import KnowledgeChunk

MAX_CHUNKS = 4
# Past this the model starts paraphrasing across unrelated passages, and the
# answer stops being traceable to one source.
MAX_CONTEXT_CHARS = 6000

# ── Thresholds ────────────────────────────────────────────────────────
# TWO gates, and both must pass. Rank alone is not enough to separate a real
# match from a stray one, because a single strong term carries it: "Do you
# sell bulletproof glass for banks?" ranks respectably against the glass
# chunk purely on the word "glass", and answering that from the glass chunk
# is exactly the failure this whole module exists to prevent.
#
#   MIN_RANK      the passage is lexically relevant at all.
#   MIN_COVERAGE  the passage accounts for enough of what was ASKED.
#
# Coverage is what kills the bulletproof-glass case: of {sell, bulletproof,
# glass, banks} only "glass" is present, so coverage is 0.25 and it deflects.
# A genuine question like "how well do your windows block noise" covers
# {windows, block, noise} at 0.67 and passes.
MIN_RANK = 0.02
MIN_COVERAGE = 0.40
STRONG_RANK = 0.15
STRONG_COVERAGE = 0.60

# A THIRD way in, for misspellings only.
#
# Coverage compares words exactly, so a typo always scores 0 coverage and can
# never pass the gate above — "casment windos" found the right chunk on
# trigram alone (rank 0.18) and was then thrown out for covering nothing.
# Word-similarity is itself evidence the query resembles a known term, so a
# high enough score stands in for coverage.
#
# 0.33, and re-tuned downward after measuring a wider set of real typos. The
# first value (0.45) was fitted to two examples that both happened to score
# high, and it turned away "slidng windos" (0.412) and "wat is the u vale"
# (0.348) — both obvious to a person, both refused.
#
# Measured, whole set:
#   typos, correct chunk : 0.348  0.412  0.533  0.611
#   out-of-corpus ceiling: 0.152  0.182  0.219  0.220
# 0.33 sits in the gap, catching every typo while clearing the highest
# out-of-corpus score by 0.11. Do not raise it without re-measuring both
# columns — the risk on one side is a refused typo, on the other an answer
# assembled from a passage that has nothing to do with the question.
FUZZY_CONFIDENT = 0.33

# The candidate filter must never be STRICTER than the confidence gate above.
# It was: the filter hardcoded 0.35 while FUZZY_CONFIDENT dropped to 0.33, so
# "wat is the u vale" (0.348) was discarded from the queryset before the gate
# could admit it — a threshold change silently defeated by a second, forgotten
# threshold. Derived from it now so the two cannot drift apart again.
FUZZY_FLOOR = FUZZY_CONFIDENT - 0.02

# Dropped before matching: they appear in nearly every chunk, so they inflate
# coverage without indicating relevance.
_STOP = {
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'do', 'does', 'did', 'doing', 'what', 'which', 'who', 'whom', 'whose',
    'how', 'why', 'when', 'where', 'can', 'could', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'i', 'you', 'we', 'they', 'it', 'he',
    'she', 'to', 'of', 'for', 'in', 'on', 'at', 'by', 'and', 'or', 'but',
    'my', 'your', 'our', 'their', 'its', 'me', 'us', 'them', 'with', 'about',
    'from', 'into', 'have', 'has', 'had', 'that', 'this', 'these', 'those',
    'there', 'here', 'get', 'got', 'any', 'some', 'much', 'many', 'need',
    'want', 'like', 'please', 'tell', 'know', 'give', 'make', 'use', 'if',
    'as', 'so', 'than', 'then', 'too', 'very', 'just', 'also', 'not', 'no',
    'yes', 'am', 'are', 'sell', 'offer', 'provide',
    # Conversational filler. These carry no topic but sat in the denominator
    # of the coverage ratio, so "looking for something for my balcony" scored
    # 1/3 and was refused for a question the site answers directly.
    'looking', 'look', 'something', 'anything', 'everything', 'thing', 'things',
    'stuff', 'one', 'ones', 'kind', 'sort', 'type', 'bit', 'lot', 'really',
    'maybe', 'perhaps', 'possibly', 'actually', 'basically', 'quite', 'okay',
    'hi', 'hello', 'hey', 'thanks', 'thank', 'please', 'sorry', 'well',
    'wondering', 'wonder', 'interested', 'thinking', 'planning', 'trying',
    # Question scaffolding. These are verbs a question is BUILT from, not what
    # it is ABOUT, and leaving them in made every question look like it
    # contained a word the site has never used (see unknown_terms below).
    'achieve', 'achieves', 'achieved', 'come', 'comes', 'include', 'includes',
    'including', 'feature', 'features', 'support', 'supports', 'mean', 'means',
    'work', 'works', 'available', 'possible', 'able', 'happen', 'happens',
    'consider', 'suppose', 'say', 'says', 'talk', 'ask', 'answer', 'help',
    # Modifiers. They qualify a subject without being one, and treating them
    # as subjects made "Can I get a custom RAL colour?" look like it asked
    # about something unpublished ("custom") when it asks about RAL colours.
    # ⚠ Kept deliberately short. An earlier version also listed big, small,
    # best, better, good, new and old — which broke "how big can they go",
    # because "big" IS the subject there, and several of them are mapped in
    # vocabulary.SYNONYMS. A word only belongs here if it can never be what a
    # question is about.
    'custom', 'specific', 'particular', 'special', 'standard', 'different',
    'certain', 'own', 'exact', 'various', 'other',
    # Reflexive pronouns — "do you install them yourself".
    'yourself', 'myself', 'itself', 'themselves', 'ourselves',
}

_WORD = re.compile(r"[A-Za-z0-9][A-Za-z0-9'\-]*")


def content_terms(text: str) -> set:
    """The words that actually carry the question's meaning."""
    return {
        w.lower() for w in _WORD.findall(text or '')
        if w.lower() not in _STOP and len(w) > 2
    }


def with_hyphen_parts(words: set) -> set:
    """Add the parts of every hyphenated compound alongside the whole.

    The corpus writes "U-value", "wood-effect" and "sea-facing", each of which
    tokenises as a SINGLE word. Without this, "value", "effect", "sea" and
    "facing" do not exist anywhere in the index, so a question using the
    ordinary two-word form matches nothing.

    Needed in BOTH places a text is turned into a term set — the vocabulary
    and the coverage haystack. Fixing only the vocabulary left "do you do
    coastal projects" at zero coverage, because the synonym "sea" still could
    not match the token "sea-facing".
    """
    out = set(words)
    for word in words:
        if '-' in word:
            out |= {part for part in word.split('-') if len(part) > 2}
    return out


# ── Is this a misspelling, or a different subject? ────────────────────
# A similarity SCORE cannot answer that. Measured: "what is your revenue"
# scores 0.381 on trigram word-similarity — higher than two genuine typos
# ("wat is the u vale" 0.348, "slidng windos" 0.412) — because trigrams
# happen to overlap, not because the site has anything to say about revenue.
# Any threshold that admits the typos admits the revenue question too.
#
# So ask the right question instead: is every word in the query either a word
# the corpus uses, or a near-miss spelling of one? "vale"->"value" and
# "slidng"->"sliding" are; "revenue" is not close to anything we publish.

_vocab_cache = {'stamp': None, 'terms': frozenset()}


def corpus_vocabulary() -> frozenset:
    """Every content word in the knowledge base, cached until it changes.

    Keyed on (row count, latest updated_at) so a `build_knowledge` run
    invalidates it without any explicit cache-busting call.
    """
    from django.db.models import Max

    stamp = KnowledgeChunk.objects.aggregate(n=Count('id'), t=Max('updated_at'))
    key = (stamp['n'], stamp['t'])
    if _vocab_cache['stamp'] != key:
        words = set()
        for title, keywords, body in KnowledgeChunk.objects.values_list(
            'title', 'keywords', 'body',
        ):
            words |= content_terms(f'{title} {keywords} {body}')
        words = with_hyphen_parts(words)
        _vocab_cache['stamp'] = key
        _vocab_cache['terms'] = frozenset(words)
    return _vocab_cache['terms']


# 0.72: "wat"->"water" is 0.75 and "brek"->"break" is 0.89, while an unrelated
# word rarely clears it. Below ~0.65 unrelated words start matching by accident.
SPELLING_RATIO = 0.72

# ...but similarity alone is not enough, and no threshold fixes it: "skylights"
# scores 0.80 against "lights" — higher than the genuine typo "wat"->"water"
# (0.75) — so a cutoff that accepts the typo accepts skylights as a
# misspelling of lights and answers a roofing question from the glass page.
#
# Typos preserve the START of a word. Every real one here shares a prefix with
# its target — slidng/sliding, casment/casement, therml/thermal, vale/value,
# wat/water — while skylights and lights share nothing. Two characters is
# enough to separate them and still admit brek/break, the shortest real case.
MIN_SHARED_PREFIX = 2


def _prefix_len(a: str, b: str) -> int:
    n = 0
    for x, y in zip(a, b):
        if x != y:
            break
        n += 1
    return n


def near_miss(term: str, known) -> bool:
    """True when `term` is plausibly a misspelling of a word we publish."""
    for candidate in get_close_matches(term, known, n=3, cutoff=SPELLING_RATIO):
        if _prefix_len(term, candidate) >= MIN_SHARED_PREFIX:
            return True
    return False


def unknown_terms(terms) -> set:
    """Content words the site has never used, in any form.

    Three ways a word counts as KNOWN:
      - it appears in the corpus
      - vocabulary.py maps it to corpus words ("leak" -> water tightness)
      - it is a near-miss spelling of a corpus word ("vale" -> value)

    Anything left is a subject this website does not cover. That is a stronger
    signal than the coverage ratio, which is diluted by however many other
    words the question happens to contain: "Do you offer a 20 year warranty on
    hinges?" covers 2 of 3 terms and sails through the ratio gate, then gets
    answered with a passage about hinges that says nothing about warranties —
    which reads as a yes.
    """
    known = corpus_vocabulary()
    if not known:
        return set()

    unknown = set()
    for term in terms:
        if term in known or term in vocabulary.SYNONYMS:
            continue
        if near_miss(term, known):
            continue
        unknown.add(term)
    return unknown


def looks_misspelled(terms) -> bool:
    """True when EVERY query term is a corpus word or a near-miss of one.

    All, not any: one recognised word is not evidence of a typo — "bulletproof
    glass" contains "glass". Requiring all of them is what keeps this from
    becoming a second way for out-of-scope questions to get in.
    """
    if not terms:
        return False

    vocabulary_terms = corpus_vocabulary()
    if not vocabulary_terms:
        return False

    for term in terms:
        if term in vocabulary_terms:
            continue
        if not near_miss(term, vocabulary_terms):
            return False
    return True


@dataclass
class Retrieved:
    chunks: list
    top_score: float
    coverage: float          # fraction of the question's terms the top chunk covers
    confident: bool          # safe to attempt an answer
    strong: bool             # answer without hedging

    @property
    def sources(self):
        """Deduplicated by path — three series chunks all point at one page,
        and listing that page three times reads like a bug."""
        seen, out = set(), []
        for chunk in self.chunks:
            if chunk.source_path in seen:
                continue
            seen.add(chunk.source_path)
            out.append({'label': chunk.source_label, 'path': chunk.source_path})
        return out

    def as_context(self):
        """The passages, formatted for the prompt.

        Each is labelled with its source so the model can cite it and so a
        wrong answer can be traced back to the passage that caused it.
        """
        parts, budget = [], MAX_CONTEXT_CHARS
        for chunk in self.chunks:
            block = f'[{chunk.title} — page: {chunk.source_path}]\n{chunk.body}'
            if len(block) > budget:
                break
            parts.append(block)
            budget -= len(block)
        return '\n\n---\n\n'.join(parts)


def _build_query(terms):
    """OR the question's terms together.

    ⚠ NOT SearchQuery(question, search_type='websearch'). websearch_to_tsquery
    ANDs every token, so "What U-value does the GWS-N1-60H achieve?" compiles
    to `u & value & gws & n1 & 60h` and matches nothing — one absent word and
    the whole question returns zero rows. Measured: AND semantics retrieved
    7/12 in-corpus questions, several scoring exactly 0.

    OR restores recall, and ts_rank_cd still does the discriminating: a chunk
    matching four of the terms outranks one matching a single term, and the
    coverage gate below throws out what is left.
    """
    return reduce(or_operator, (SearchQuery(t, config='english') for t in terms))


def search(question: str, limit: int = MAX_CHUNKS) -> Retrieved:
    question = (question or '').strip()
    empty = Retrieved([], 0.0, 0.0, False, False)
    if not question:
        return empty

    terms = content_terms(question)
    if not terms:
        return empty

    # Bridge the visitor's words to the site's words before searching. See
    # vocabulary.py — this is what lets "do they leak" reach the passage about
    # water tightness.
    query_terms, satisfies = vocabulary.expand(terms)
    query = _build_query(query_terms)

    rows = (
        KnowledgeChunk.objects.annotate(
            lexical=SearchRank(F('search_vector'), query, cover_density=True),
            # WORD similarity, not plain similarity: it scores the best-matching
            # word inside the field rather than the field as a whole. Comparing
            # a three-word question against a 40-word keywords blob with plain
            # similarity always scores near zero purely on length — which is why
            # "therml brek" retrieved nothing before.
            fuzzy=Greatest(
                TrigramWordSimilarity(question, 'title'),
                TrigramWordSimilarity(question, 'keywords'),
                output_field=FloatField(),
            ),
        )
        .annotate(
            score=F('lexical') + F('fuzzy') * Value(0.30, output_field=FloatField()),
        )
        .filter(Q(lexical__gt=0) | Q(fuzzy__gt=FUZZY_FLOOR))
        .order_by('-score')[:limit]
    )

    chunks = list(rows)
    if not chunks:
        return empty

    top_chunk = chunks[0]
    top = float(top_chunk.score or 0.0)

    # Coverage is measured against the WHOLE retrieved set, not the top chunk
    # alone. The set is what actually goes to the model as context, so "can
    # this answer the question" is the right thing to ask of it — and a
    # comparison like "sliding vs casement" is only ever answerable from two
    # chunks at once. Judging the top chunk alone rejected every such question.
    #
    # This does not weaken the refusal behaviour: "bulletproof glass for banks"
    # still finds neither "bulletproof" nor "banks" anywhere in the set, so it
    # covers 1 of 3 and is still turned away.
    haystack = set()
    for chunk in chunks:
        haystack |= content_terms(f'{chunk.title} {chunk.keywords} {chunk.body}')
    haystack = with_hyphen_parts(haystack)

    coverage = vocabulary.coverage(terms, satisfies, haystack)
    fuzzy = float(getattr(top_chunk, 'fuzzy', 0.0) or 0.0)

    # Either the passage covers enough of the question, or the question is a
    # near-miss spelling of something the passage is about.
    # The fuzzy path is a TYPO rescue, so it now requires evidence of a typo —
    # a high similarity score alone let "what is your revenue" (0.381) in.
    rescued = fuzzy >= FUZZY_CONFIDENT and looks_misspelled(terms)

    # A word we have never published is a subject we do not cover. Refusing
    # here is the safe direction: the cost of being wrong is a contact-page
    # redirect for a question we could have answered, versus confidently
    # answering a question we cannot. If this fires on something legitimate,
    # the fix is to add the word to vocabulary.SYNONYMS or to the corpus —
    # not to loosen the gate.
    unknown = unknown_terms(terms)

    confident = (
        (top >= MIN_RANK and coverage >= MIN_COVERAGE and not unknown) or rescued
    )
    # `strong` stays strict — a rescued typo is answered, but the UI does not
    # present it as unhedged.
    strong = top >= STRONG_RANK and coverage >= STRONG_COVERAGE

    return Retrieved(
        chunks=chunks,
        top_score=round(top, 4),
        coverage=round(coverage, 3),
        confident=confident,
        strong=strong,
    )


def rebuild_vectors():
    """Recompute every stored tsvector.

    A plain .update() with the expression, not a save() loop: the vector is
    derived entirely from columns Postgres already holds, so it computes in
    one statement server-side rather than pulling 25 rows into Python.
    """
    return KnowledgeChunk.objects.update(search_vector=KnowledgeChunk.vector_expression())
