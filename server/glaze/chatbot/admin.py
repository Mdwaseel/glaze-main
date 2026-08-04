from django.contrib import admin

from .models import ChatMessage, ChatSession, KnowledgeChunk


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ('title', 'topic', 'source_path', 'updated_at')
    list_filter = ('topic',)
    search_fields = ('title', 'body', 'keywords')
    readonly_fields = ('key', 'updated_at')

    # Rebuilt wholesale by `manage.py build_knowledge`; anything typed here is
    # overwritten on the next run, so the form is read-only to avoid the trap.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    can_delete = False
    readonly_fields = ('role', 'content', 'sources', 'top_score', 'deflected',
                       'answer_mode', 'latency_ms', 'created_at')

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('key', 'entry_path', 'started_at', 'last_at')
    search_fields = ('key', 'entry_path', 'messages__content')
    date_hierarchy = 'started_at'
    inlines = (ChatMessageInline,)
    readonly_fields = ('key', 'entry_path', 'started_at', 'last_at')

    def has_add_permission(self, request):
        return False
