from django.urls import path

from . import views

app_name = 'chatbot'

urlpatterns = [
    # Public
    path('chat/', views.chat, name='chat'),
    path('chat/suggestions/', views.suggestions, name='chat-suggestions'),

    # Admin
    path('admin/chat/knowledge/', views.AdminKnowledgeView.as_view(), name='admin-knowledge'),
    path('admin/chat/sessions/', views.AdminConversationView.as_view(), name='admin-sessions'),
    path('admin/chat/stats/', views.AdminChatStatsView.as_view(), name='admin-chat-stats'),
]
