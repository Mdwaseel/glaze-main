from django.contrib import admin

from .models import Author, Category, Comment, Post, Tag


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'order', 'accent_color')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'is_active', 'user')
    list_filter = ('is_active',)
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name', 'role', 'email')


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'category', 'author', 'is_featured', 'published_at', 'view_count')
    list_filter = ('status', 'is_featured', 'category', 'comments_enabled')
    search_fields = ('title', 'excerpt', 'content', 'focus_keyword')
    prepopulated_fields = {'slug': ('title',)}
    filter_horizontal = ('tags',)
    date_hierarchy = 'published_at'
    # Both are computed in Post.save(); editing them here would be overwritten.
    readonly_fields = ('reading_time', 'view_count', 'created_at', 'updated_at')

    fieldsets = (
        ('Content', {'fields': ('title', 'slug', 'excerpt', 'content', 'takeaways')}),
        ('Featured image', {'fields': ('featured_image', 'image_alt')}),
        ('Category & author', {'fields': ('category', 'author', 'show_author', 'tags')}),
        ('SEO', {
            'fields': ('meta_title', 'meta_description', 'focus_keyword', 'canonical_url', 'noindex'),
            'description': 'Leave the title and description blank to auto-generate them from the title and excerpt.',
        }),
        ('Publishing', {'fields': ('status', 'published_at', 'is_featured', 'comments_enabled')}),
        ('Computed', {'fields': ('reading_time', 'view_count', 'created_at', 'updated_at')}),
    )


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'name', 'post', 'status')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'email', 'body')
    readonly_fields = ('post', 'parent', 'name', 'email', 'body', 'ip_address', 'created_at')
    actions = ('approve_selected', 'mark_spam')

    @admin.action(description='Approve selected comments')
    def approve_selected(self, request, queryset):
        queryset.update(status=Comment.STATUS_APPROVED)

    @admin.action(description='Mark selected as spam')
    def mark_spam(self, request, queryset):
        queryset.update(status=Comment.STATUS_SPAM)

    def has_add_permission(self, request):
        return False
