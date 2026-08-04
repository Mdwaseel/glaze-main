"""Bridging how people ask and how the site writes.

THE PROBLEM THIS SOLVES. Lexical retrieval matches words, and visitors do not
use the words a specification document uses. Measured against this corpus
before this module existed:

    "do they leak"          -> 0 matches   (site says "water tightness, 600 Pa")
    "are they noisy"        -> 0 matches   (site says "acoustic, Rw 41-44 dB")
    "how big can they go"   -> 0 matches   (site says "maximum sash dimensions")
    "whats the biggest one" -> 0 matches

Every one of those is a question the site answers well, and every one was sent
to the contact page. This is precisely the weakness the module docstring in
models.py predicted for lexical search, and it is the main thing that made the
assistant feel broken.

HOW IT WORKS. Each question term is expanded to the corpus vocabulary that
means the same thing. The expansion is used twice:

  ranking   the tsquery ORs in the synonyms, so "leak" reaches the passage
            about water tightness.

  coverage  a question term counts as covered if IT or any of its synonyms is
            present. Without this the gate would still reject the passage —
            expansion would improve the ranking and change nothing about the
            decision, which was the actual bug.

DIRECTIONALITY. Entries map HUMAN word -> CORPUS words, not the reverse, and
they are deliberately narrow. A loose thesaurus would make everything match
everything and collapse the deflection behaviour that stops the assistant
inventing answers — the whole point is that "bulletproof glass" still finds
nothing.
"""

# Human phrasing -> the vocabulary the site actually uses.
SYNONYMS = {
    # ── size ──────────────────────────────────────────────────────────
    'big': {'maximum', 'size', 'height', 'width', 'dimensions', 'span', 'sash', 'large', 'tall', 'metres'},
    'bigger': {'maximum', 'size', 'height', 'span', 'large'},
    'biggest': {'maximum', 'size', 'height', 'span', 'large', 'metres'},
    'large': {'maximum', 'size', 'height', 'span', 'metres'},
    'largest': {'maximum', 'size', 'height', 'span', 'metres'},
    'huge': {'maximum', 'size', 'height', 'span', 'metres'},
    'tall': {'height', 'maximum', 'metres', 'sash'},
    'tallest': {'height', 'maximum', 'metres'},
    'wide': {'width', 'maximum', 'dimensions'},
    'widest': {'width', 'maximum', 'dimensions'},
    'size': {'dimensions', 'maximum', 'height', 'width', 'sash'},
    'sizes': {'dimensions', 'maximum', 'height', 'width', 'sash'},
    'dimension': {'dimensions', 'maximum', 'height', 'width'},
    'heavy': {'weight', 'kg', 'sash', 'maximum'},
    'weigh': {'weight', 'kg', 'sash'},
    'span': {'metres', 'height', 'maximum'},

    # ── weather / water ──────────────────────────────────────────────
    'leak': {'water', 'tightness', 'leakage', 'seal', 'sealed', 'permeability'},
    'leaks': {'water', 'tightness', 'leakage', 'seal', 'sealed'},
    'leaking': {'water', 'tightness', 'leakage', 'seal'},
    'leaky': {'water', 'tightness', 'leakage', 'seal'},
    'rain': {'water', 'tightness', 'weather', 'leakage', 'sealed'},
    'rainy': {'water', 'tightness', 'weather'},
    'monsoon': {'water', 'tightness', 'weather', 'leakage'},
    'waterproof': {'water', 'tightness', 'leakage', 'sealed'},
    'weatherproof': {'water', 'weather', 'tightness', 'air', 'permeability'},
    'storm': {'water', 'weather', 'wind', 'tightness'},
    'draught': {'air', 'permeability', 'sealed', 'class'},
    'draughty': {'air', 'permeability', 'sealed'},
    'dust': {'air', 'permeability', 'sealed', 'class'},

    # ── acoustics ────────────────────────────────────────────────────
    'noisy': {'acoustic', 'noise', 'sound', 'laminated'},
    'noise': {'acoustic', 'sound', 'laminated'},
    'loud': {'acoustic', 'noise', 'sound'},
    'quiet': {'acoustic', 'noise', 'sound', 'laminated'},
    'sound': {'acoustic', 'noise', 'laminated'},
    'soundproof': {'acoustic', 'noise', 'sound', 'laminated'},
    'soundproofing': {'acoustic', 'noise', 'laminated'},
    'traffic': {'acoustic', 'noise', 'road', 'sound'},

    # ── thermal ──────────────────────────────────────────────────────
    'hot': {'thermal', 'heat', 'value', 'transmittance', 'break'},
    'heat': {'thermal', 'transmittance', 'value', 'break'},
    'cold': {'thermal', 'transmittance', 'value', 'break'},
    'warm': {'thermal', 'transmittance', 'value', 'break'},
    'insulation': {'thermal', 'transmittance', 'value', 'break', 'polyamide'},
    'insulated': {'thermal', 'break', 'polyamide', 'value'},
    'efficient': {'thermal', 'transmittance', 'value'},
    'efficiency': {'thermal', 'transmittance', 'value'},
    'energy': {'thermal', 'transmittance', 'value'},
    'condensation': {'thermal', 'break', 'dew', 'surface'},
    'sweating': {'condensation', 'thermal', 'break'},

    # ── structure ────────────────────────────────────────────────────
    'strong': {'weight', 'kg', 'load', 'structural', 'hardware'},
    'strength': {'weight', 'load', 'structural'},
    'wind': {'load', 'pressure', 'structural', 'weather'},
    'safe': {'laminated', 'toughened', 'security'},
    'secure': {'lock', 'locking', 'hardware', 'security'},
    'security': {'lock', 'locking', 'hardware'},

    # ── appearance ───────────────────────────────────────────────────
    'colour': {'ral', 'powder', 'coated', 'anodised', 'finish', 'finishes'},
    'color': {'ral', 'powder', 'coated', 'anodised', 'finish', 'finishes'},
    'colours': {'ral', 'powder', 'coated', 'anodised', 'finishes'},
    'colors': {'ral', 'powder', 'coated', 'anodised', 'finishes'},
    'paint': {'powder', 'coated', 'ral', 'finish'},
    'painted': {'powder', 'coated', 'ral', 'finish'},
    'shade': {'ral', 'colour', 'finish'},
    'wood': {'wood', 'effect', 'finish', 'finishes'},
    'wooden': {'wood', 'effect', 'finish'},
    'slim': {'sightline', 'sightlines', 'narrow', 'minimal'},
    'thin': {'sightline', 'sightlines', 'narrow', 'minimal'},
    'frame': {'profile', 'sightline', 'aluminium'},
    'frames': {'profile', 'profiles', 'sightlines', 'aluminium'},

    # ── glass ────────────────────────────────────────────────────────
    'glazing': {'glass', 'glazed', 'laminated', 'unit'},
    'pane': {'glass', 'glazed', 'unit'},
    'panes': {'glass', 'glazed', 'unit'},
    'doubleglazed': {'glass', 'double', 'glazed', 'unit'},

    # ── hardware / operation ─────────────────────────────────────────
    'handle': {'hardware', 'german', 'handles', 'locking'},
    'handles': {'hardware', 'german', 'locking'},
    'lock': {'locking', 'hardware', 'german'},
    'hinge': {'hardware', 'hinges', 'german'},
    'hinges': {'hardware', 'german'},
    'roller': {'rollers', 'stainless', 'track', 'hardware'},
    'rollers': {'stainless', 'track', 'hardware'},
    'smooth': {'glide', 'rollers', 'effortless'},
    'easy': {'glide', 'fingertip', 'effortless', 'hand'},
    'operate': {'glide', 'open', 'hardware', 'handle'},
    'durable': {'cycles', 'hardware', 'tested'},
    'lasts': {'cycles', 'hardware', 'tested'},

    # ── use cases ────────────────────────────────────────────────────
    'balcony': {'balcony', 'door', 'sliding', 'panoramic'},
    'sea': {'sea', 'facing', 'coastal', 'exposed'},
    'seaside': {'sea', 'facing', 'coastal', 'exposed'},
    'coastal': {'sea', 'facing', 'exposed'},
    'beach': {'sea', 'facing', 'coastal'},
    'villa': {'residential', 'home', 'project'},
    'apartment': {'residential', 'balcony', 'home'},
    'flat': {'residential', 'balcony', 'apartment'},
    'home': {'residential', 'house'},
    'house': {'residential', 'home'},
    'office': {'commercial', 'project'},
    'view': {'panoramic', 'sightlines', 'glass', 'minimal'},
    'views': {'panoramic', 'sightlines', 'glass'},

    # ── recommendation ───────────────────────────────────────────────
    'recommend': {'suited', 'best', 'fits', 'suits'},
    'recommendation': {'suited', 'best', 'fits'},
    'best': {'suited', 'best', 'fits'},
    'better': {'suited', 'best', 'fits'},
    'suitable': {'suited', 'fits', 'best'},
    'suit': {'suited', 'fits', 'best'},
    'choose': {'suited', 'fits', 'best', 'series'},
    'difference': {'series', 'type', 'suited', 'systems'},
    'compare': {'series', 'type', 'systems'},
    'versus': {'series', 'systems'},

    # ── spelling and spacing variants ────────────────────────────────
    # The catalogue writes "Bi-Fold" and "Lift & Slide"; nobody types the
    # hyphen or the ampersand. Without these, "which is better bifold or
    # sliding" never retrieved the bi-fold passage at all, and the model
    # correctly reported it had nothing to compare.
    'bifold': {'fold', 'folding', 'bi', 'leaf', 'leaves'},
    'bifolds': {'fold', 'folding', 'bi', 'leaf'},
    'folding': {'fold', 'bi', 'leaf'},
    'liftslide': {'lift', 'slide', 'sliding'},
    'liftandslide': {'lift', 'slide', 'sliding'},
    'uvalue': {'value', 'thermal', 'transmittance'},
    'rvalue': {'value', 'thermal', 'transmittance'},
    'sightline': {'sightlines', 'narrow', 'minimal', 'profile'},
    'casements': {'casement'},
    'sliders': {'sliding', 'slide'},
    'slider': {'sliding', 'slide'},

    # ── company / logistics ──────────────────────────────────────────
    'install': {'installation', 'install', 'fitted', 'in-house'},
    'installation': {'install', 'fitted', 'in-house'},
    'fit': {'installation', 'install', 'fitted'},
    'delivery': {'lead', 'time', 'installation'},
    'lead': {'lead', 'time', 'installation'},
    'experience': {'since', 'years', 'aluminium', 'history'},
    'established': {'since', 'years', 'history'},
    'showroom': {'showroom', 'visit', 'jubilee', 'hyderabad', 'workshop'},
    'address': {'jubilee', 'hyderabad', 'address', 'location'},
    'location': {'jubilee', 'hyderabad', 'address'},
    'reach': {'contact', 'phone', 'email', 'whatsapp'},
    'call': {'phone', 'contact', 'number'},
}

# Words that add nothing to a query but are not stopwords in the usual sense.
# "windows" and "doors" appear in nearly every chunk, so counting them toward
# coverage lets an unrelated question look well covered.
LOW_SIGNAL = {'window', 'windows', 'door', 'doors', 'system', 'systems', 'glaze', 'aluminium', 'aluminum'}


def expand(terms):
    """Return (query_terms, satisfies).

    query_terms  everything to OR into the tsquery — the originals plus their
                 corpus equivalents.
    satisfies    original term -> the set of words that count as covering it,
                 used by the coverage gate.
    """
    query_terms = set()
    satisfies = {}

    for term in terms:
        equivalents = SYNONYMS.get(term, set())
        # The original always counts for itself, so an exact hit still works
        # when no synonym entry exists.
        satisfies[term] = {term} | equivalents
        query_terms |= satisfies[term]

    return query_terms, satisfies


def coverage(terms, satisfies, haystack) -> float:
    """Fraction of the question's terms present in the retrieved text.

    Low-signal words are dropped from the denominator rather than counted as
    free hits — "what size windows do you do" should be judged on "size", not
    rewarded for containing "windows".
    """
    meaningful = {t for t in terms if t not in LOW_SIGNAL} or set(terms)
    if not meaningful:
        return 0.0
    hits = sum(1 for t in meaningful if satisfies.get(t, {t}) & haystack)
    return hits / len(meaningful)
