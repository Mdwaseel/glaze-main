"""The chat endpoint.

Deflection copy lives here rather than in the model. When retrieval finds
nothing, the visitor gets a fixed, written sentence pointing at the contact
page — not a generated one. Generating the "I don't know" is how you end up
with a model that apologises its way into inventing an answer anyway.
"""

import re
import secrets

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from account.permissions import IsStaff
from siteconfig.models import SiteSettings

from . import intents, llm, retrieval
from .models import ChatMessage, ChatSession, KnowledgeChunk
from .serializers import (
    AdminChatSessionSerializer,
    ChatRequestSerializer,
    KnowledgeChunkSerializer,
)

CONTACT_PATH = '/contact'

# Written, not generated. Varied slightly by whether we found nothing at all
# or found something too weak to trust.
DEFLECT_NOTHING = (
    "I can only answer from what's published on this site, and I couldn't find "
    "anything covering that. The team can help directly — send it through the "
    "contact page and someone will come back to you."
)
DEFLECT_WEAK = (
    "I'm not confident enough in what I found to answer that properly, and I'd "
    "rather not guess. The team can give you a definite answer through the "
    "contact page."
)
PRICING_HINT = (
    "Pricing is always project-specific — it depends on the series, glass "
    "build-up, opening sizes and finish — so there's no published price list. "
    "Send your drawings or opening sizes through the contact page and the team "
    "will come back with a quotation."
)

# Matched before retrieval. A pricing question often retrieves the contact
# chunk with a decent score, and the model would then paraphrase it — this
# guarantees the same correct answer every time instead.
# ⚠ REGEX, NOT SUBSTRINGS. The substring version contained "how much", which
# matched "How much noise do your windows block?" and answered a question about
# acoustics with the pricing policy. "how much" only signals money when it is
# followed by a verb ("how much is/does it cost"), not by a noun being measured.
PRICING_RE = re.compile(
    r'\b(?:price|pricing|prices|cost|costs|costing|quote|quotation|quotes'
    r'|rate|rates|budget|expensive|cheap|afford|affordable|discount)\b'
    r'|\bhow much (?:is|are|do|does|would|will|might)\b'
    r'|\bper (?:sq\.?\s?ft|sqft|square (?:foot|feet)|panel|window|door|unit)\b',
    re.I,
)

# Second-chance deflection, read off the model's own reply.
#
# The coverage gate in retrieval.py is a ratio, so a SHORT question inflates
# it: "Do you sell bulletproof glass?" reduces to {bulletproof, glass}, one of
# which matches, giving 0.5 — over the 0.40 threshold. Retrieval therefore
# passes it, and the model then correctly reports that bulletproof glass is not
# mentioned. Without this the visitor reads "that isn't covered" and gets no
# contact card, which is the one moment they most need the route out.
#
# These are ABSENCE markers only. Deliberately NOT matching "contact page" or
# "get in touch" — models append those to perfectly good answers as a
# pleasantry, and keying on them would put a deflection card under half the
# correct replies.
# ⚠ THIS LIST IS A CONTRACT WITH THE SYSTEM PROMPT. Rule 8 in llm.py tells the
# model to admit a gap with "we don't publish that" or "I don't have that
# detail" — so those exact phrasings have to appear here, or the prompt
# instructs a wording the detector cannot see. Change one, change the other.
ABSENCE_MARKERS = (
    # phrasings the prompt asks for
    "don't publish", 'do not publish', 'not published',
    "don't have that detail", 'do not have that detail',
    "don't have details", "don't have specific",
    # generic absence phrasings models fall back on
    'does not contain', "doesn't contain",
    'does not mention', "doesn't mention",
    'not mentioned', 'no mention', 'no specific mention',
    'does not specify', "doesn't specify",
    'no information', "don't have information", 'do not have information',
    'not covered', 'not listed', 'not available in',
    "i don't know", 'i do not know',
    'unable to find', 'could not find', "couldn't find",
)


def reply_admits_gap(reply: str) -> bool:
    return any(marker in reply.lower() for marker in ABSENCE_MARKERS)


def _session_for(key: str, entry_path: str) -> ChatSession:
    if key:
        existing = ChatSession.objects.filter(key=key).first()
        if existing:
            return existing
    # Server-minted. A client-supplied id would let anyone read or extend
    # someone else's conversation by guessing it.
    return ChatSession.objects.create(
        key=secrets.token_urlsafe(24), entry_path=entry_path[:200],
    )


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def chat(request):
    """POST /api/v1/chat/

    Body: {question, session?, path?, history?}
    """
    serializer = ChatRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    question = data['question'].strip()
    session = _session_for(data.get('session', ''), data.get('path', ''))
    session.save(update_fields=['last_at'])

    ChatMessage.objects.create(session=session, role=ChatMessage.ROLE_USER, content=question)

    site = SiteSettings.load()
    contact = {
        'path': CONTACT_PATH,
        'label': 'Contact us',
        'email': site.contact_email,
        'phone': site.contact_phone,
        'whatsapp': site.whatsapp_link,
    }

    # ── 1. Conversational intents, before anything else ──────────────
    # "hi", "thanks", "who are you?" are not retrieval problems, and running
    # them through the pipeline routed every one of them to the contact page.
    # Answered from a fixed string: no provider call, no latency, nothing to
    # hallucinate. See chatbot/intents.py.
    intent, remainder = intents.detect(question)
    if intent:
        reply = intents.RESPONSES[intent]
        show_contact = intent in intents.SHOWS_CONTACT
        ChatMessage.objects.create(
            session=session, role=ChatMessage.ROLE_ASSISTANT, content=reply,
            sources=[], top_score=None, deflected=show_contact,
            answer_mode=f'intent:{intent}',
        )
        return Response({
            'session': session.key,
            'answer': reply,
            'sources': [],
            'deflected': show_contact,
            'confident': True,
            'contact': contact,
            'degraded': False,
        })

    # A greeting in front of a real question ("hi, what U-value…") is stripped
    # so the retriever sees only the question.
    searchable = remainder or question

    asking_price = bool(PRICING_RE.search(searchable))

    found = retrieval.search(searchable)

    if asking_price:
        reply, mode, deflected, sources = PRICING_HINT, 'policy', True, [
            {'label': 'Contact', 'path': CONTACT_PATH},
        ]
        error, latency = '', 0
    elif not found.confident:
        reply = DEFLECT_NOTHING if found.top_score == 0 else DEFLECT_WEAK
        mode, deflected, sources = llm.MODE_DEFLECT, True, []
        error, latency = '', 0
    else:
        result = llm.answer(searchable, found, data.get('history'))
        reply = result['text']
        # The provider name is recorded alongside the mode so the admin can
        # see the chain silently running on its second choice.
        mode = f"{result['mode']}:{result['provider']}" if result.get('provider') else result['mode']
        # The model may report a gap the coverage gate let through — see
        # ABSENCE_MARKERS. Treat that as a deflection so the contact card
        # renders, and drop the sources: citing pages that did NOT answer the
        # question is worse than citing none.
        deflected = reply_admits_gap(reply)
        sources = [] if deflected else found.sources
        error, latency = result['error'], result['latency_ms']

    ChatMessage.objects.create(
        session=session,
        role=ChatMessage.ROLE_ASSISTANT,
        content=reply,
        sources=sources,
        top_score=found.top_score,
        deflected=deflected,
        answer_mode=mode,
        latency_ms=latency or None,
    )

    result_mode_is_extractive = mode == llm.MODE_EXTRACTIVE

    return Response({
        'session': session.key,
        'answer': reply,
        'sources': sources,
        # Drives the UI: a deflected answer shows the contact card, a
        # non-strong one shows sources with a "this may be partial" note.
        'deflected': deflected,
        'confident': found.strong,
        'contact': contact,
        # Never the reason — staff read that in the admin, visitors do not.
        'degraded': result_mode_is_extractive,
    })


chat.throttle_scope = 'chat'


@api_view(['GET'])
@permission_classes([AllowAny])
def suggestions(request):
    """GET /api/v1/chat/suggestions/ — opening prompts for the empty state.

    Drawn from the corpus that actually exists, so every suggested question is
    one the assistant can definitely answer. Hard-coding these would let them
    rot into questions the knowledge base no longer covers.
    """
    topics = set(KnowledgeChunk.objects.values_list('topic', flat=True))
    pool = [
        ('systems', 'Which system suits a sea-facing balcony?'),
        ('systems', 'What is the difference between sliding and lift & slide?'),
        ('performance', 'How well do your windows block noise?'),
        ('performance', 'What U-values do your systems achieve?'),
        ('specification', 'What glass options are available?'),
        ('specification', 'Can I get a specific RAL colour?'),
        ('company', 'How long has Glaze been making windows?'),
        ('contact', 'Can I visit the showroom?'),
    ]
    return Response({
        'suggestions': [text for topic, text in pool if topic in topics][:4],
    })


class AdminKnowledgeView(APIView):
    """GET /api/v1/admin/chat/knowledge/ — what the assistant can answer from."""

    permission_classes = [IsStaff]

    def get(self, request):
        chunks = KnowledgeChunk.objects.all()
        return Response({
            'count': chunks.count(),
            'results': KnowledgeChunkSerializer(chunks, many=True).data,
        })


class AdminConversationView(APIView):
    """GET /api/v1/admin/chat/sessions/?deflected=true

    The deflected filter is the point of this screen: it lists the questions
    visitors asked that the website could not answer, which is a prioritised
    list of what to write next.
    """

    permission_classes = [IsStaff]

    def get(self, request):
        sessions = ChatSession.objects.prefetch_related('messages').all()

        if request.query_params.get('deflected') == 'true':
            sessions = sessions.filter(messages__deflected=True).distinct()

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(sessions, request)
        return paginator.get_paginated_response(
            AdminChatSessionSerializer(page, many=True).data
        )


class AdminChatStatsView(APIView):
    """GET /api/v1/admin/chat/stats/ — assistant health at a glance."""

    permission_classes = [IsStaff]

    def get(self, request):
        from datetime import timedelta

        from django.db.models import Avg, Count, Q

        since = timezone.now() - timedelta(days=30)
        replies = ChatMessage.objects.filter(
            role=ChatMessage.ROLE_ASSISTANT, created_at__gte=since,
        )
        total = replies.count()
        deflected = replies.filter(deflected=True).count()

        return Response({
            'sessions_30d': ChatSession.objects.filter(started_at__gte=since).count(),
            'answers_30d': total,
            'deflected_30d': deflected,
            # The headline number. Climbing means the site has gaps.
            'deflection_rate': round(deflected / total * 100, 1) if total else 0.0,
            'avg_latency_ms': int(replies.aggregate(v=Avg('latency_ms'))['v'] or 0),
            'by_mode': list(
                replies.values('answer_mode').annotate(count=Count('id')).order_by('-count')
            ),
            'knowledge_chunks': KnowledgeChunk.objects.count(),
            'llm_configured': llm.is_configured(),
            'unanswered': list(
                ChatMessage.objects.filter(
                    role=ChatMessage.ROLE_USER, created_at__gte=since,
                    session__messages__deflected=True,
                )
                .values_list('content', flat=True)
                .distinct()[:25]
            ),
        })
