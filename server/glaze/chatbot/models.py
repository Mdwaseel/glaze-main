"""Knowledge base and conversation log for the site assistant.

RETRIEVAL CHOICE — why PostgreSQL full-text search and not vector embeddings.

The obvious RAG shape is embeddings + cosine similarity, and it is the wrong
tool here for three reasons:

1. Cerebras serves inference only — it has no embeddings endpoint. Adding
   semantic search would mean either a second vendor on the critical path or
   sentence-transformers locally, which drags in PyTorch (~2 GB) to search a
   corpus of 25 passages.

2. The corpus is small and the vocabulary is closed. Visitors ask about
   "U-value", "Rw", "sliding", "GWS-N1-60H", "thermal break" — precise domain
   terms that lexical search matches exactly and that embeddings often blur
   together (every window system looks similar in vector space; the whole
   corpus is about windows).

3. Postgres is already here, `to_tsvector` is already indexed, and pg_trgm
   covers the misspellings that are the real weakness of lexical search —
   "therml brek" scores 0.44 similarity against "thermal break".

The honest limitation: a purely conceptual question with no shared vocabulary
("how do I stop my flat getting so hot?") retrieves less well than embeddings
would. That failure is safe, because it lands on the deflect-to-contact path
rather than on a wrong answer. If the corpus grows past a few hundred chunks
or starts covering open-ended topics, revisit — pgvector is the upgrade and
it drops in beside this without changing the API.
"""

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector, SearchVectorField
from django.db import models


class KnowledgeChunk(models.Model):
    """One retrievable passage of site content.

    Rebuilt wholesale by `manage.py build_knowledge`. Nothing is authored
    here — `key` is the stable identity that lets a rebuild upsert rather
    than duplicate, and rows whose key disappears from the source are
    deleted, so removing content from the site removes it from the bot.
    """

    TOPIC_CHOICES = [
        ('systems', 'Systems'),
        ('series', 'Series catalogue'),
        ('company', 'Company'),
        ('process', 'Process'),
        ('performance', 'Performance'),
        ('specification', 'Specification'),
        ('contact', 'Contact'),
        ('blog', 'Blog'),
    ]

    key = models.CharField(max_length=120, unique=True)
    title = models.CharField(max_length=200)
    body = models.TextField()
    # Extra query terms that should hit this chunk but do not appear in the
    # prose — "color" for the finishes chunk, "how much" for contact.
    keywords = models.TextField(blank=True)

    topic = models.CharField(max_length=20, choices=TOPIC_CHOICES, db_index=True)
    source_label = models.CharField(max_length=120)
    source_path = models.CharField(max_length=200)

    search_vector = SearchVectorField(null=True, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chatbot_knowledge_chunk'
        ordering = ('topic', 'title')
        indexes = [
            # Without this the ranking query sequentially scans and re-parses
            # every row's tsvector on each question.
            GinIndex(fields=['search_vector'], name='chunk_search_gin'),
        ]

    def __str__(self):
        return f'{self.topic}: {self.title}'

    @classmethod
    def vector_expression(cls):
        """Weighted tsvector. Title and keywords outrank body.

        A question naming a series ("GWS-N1-60H") must surface that series'
        own chunk, not the six system chunks that each mention it in passing.
        Weight A on title/keywords is what produces that.
        """
        return (
            SearchVector('title', weight='A', config='english')
            + SearchVector('keywords', weight='A', config='english')
            + SearchVector('body', weight='B', config='english')
        )


class ChatSession(models.Model):
    """One visitor conversation.

    Logged because the questions the bot cannot answer are the most valuable
    output it produces — they are a list of what the website is missing,
    ranked by demand. The admin dashboard reads `deflected` for exactly that.

    No visitor identity is stored: no IP, no cookie, no fingerprint. The
    `key` is a random token the browser holds in sessionStorage and forgets
    when the tab closes.
    """

    key = models.CharField(max_length=64, unique=True, db_index=True)
    started_at = models.DateTimeField(auto_now_add=True, db_index=True)
    last_at = models.DateTimeField(auto_now=True)
    # Where the visitor was when they opened the chat — a question asked on
    # /products/pivot usually means pivot even when it does not say so.
    entry_path = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'chatbot_session'
        ordering = ('-last_at',)

    def __str__(self):
        return f'{self.key[:8]}… ({self.messages.count()} messages)'


class ChatMessage(models.Model):
    ROLE_USER = 'user'
    ROLE_ASSISTANT = 'assistant'
    ROLE_CHOICES = [(ROLE_USER, 'Visitor'), (ROLE_ASSISTANT, 'Assistant')]

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=12, choices=ROLE_CHOICES)
    content = models.TextField()

    # Assistant rows only — how the answer was produced, which is what makes
    # a bad answer diagnosable after the fact.
    sources = models.JSONField(default=list, blank=True)
    top_score = models.FloatField(null=True, blank=True)
    deflected = models.BooleanField(default=False, db_index=True)
    answer_mode = models.CharField(max_length=40, blank=True)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'chatbot_message'
        ordering = ('created_at',)

    def __str__(self):
        return f'{self.role}: {self.content[:60]}'
