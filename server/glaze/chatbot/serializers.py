from rest_framework import serializers

from .models import ChatMessage, ChatSession, KnowledgeChunk


class ChatRequestSerializer(serializers.Serializer):
    """Public request shape.

    Every field is bounded. This endpoint is unauthenticated, so an unbounded
    `question` is a free way to push 2 MB of text into the model's context —
    and into the bill.
    """

    question = serializers.CharField(max_length=500, trim_whitespace=True)
    session = serializers.CharField(max_length=64, required=False, allow_blank=True)
    path = serializers.CharField(max_length=200, required=False, allow_blank=True)
    history = serializers.ListField(
        child=serializers.DictField(), required=False, max_length=12,
    )

    def validate_question(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Please type a question.')
        return value


class KnowledgeChunkSerializer(serializers.ModelSerializer):
    word_count = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeChunk
        fields = (
            'id', 'key', 'title', 'topic', 'source_label', 'source_path',
            'keywords', 'word_count', 'updated_at',
        )

    def get_word_count(self, obj):
        return len(obj.body.split())


class AdminChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = (
            'role', 'content', 'sources', 'top_score', 'deflected',
            'answer_mode', 'latency_ms', 'created_at',
        )


class AdminChatSessionSerializer(serializers.ModelSerializer):
    messages = AdminChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = ChatSession
        fields = ('key', 'entry_path', 'started_at', 'last_at', 'message_count', 'messages')
