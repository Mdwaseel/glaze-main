from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import AdminPasswordChangeForm

from .models import AuditLog, LoginAttempt, LoginLockout, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    change_password_form = AdminPasswordChangeForm
    ordering = ('-date_joined',)
    list_display = ('email', 'full_name', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'is_superuser')
    search_fields = ('email', 'full_name')
    readonly_fields = ('id', 'date_joined', 'last_login')

    fieldsets = (
        (None, {'fields': ('id', 'email', 'password')}),
        ('Personal info', {'fields': ('full_name',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'password1', 'password2'),
        }),
    )


class ReadOnlyAdmin(admin.ModelAdmin):
    """Evidence, not editable records.

    Login attempts and the audit log are only worth anything if nobody can
    quietly rewrite them, so add/change are closed here as well as in the API.
    """

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(LoginAttempt)
class LoginAttemptAdmin(ReadOnlyAdmin):
    list_display = ('created_at', 'email', 'ip_address', 'successful', 'reason')
    list_filter = ('successful', 'reason', 'created_at')
    search_fields = ('email', 'ip_address')
    date_hierarchy = 'created_at'


@admin.register(LoginLockout)
class LoginLockoutAdmin(admin.ModelAdmin):
    """Deletable on purpose — this is the "unlock a locked-out colleague" button."""

    list_display = ('scope', 'key', 'strikes', 'locked_until', 'updated_at')
    list_filter = ('scope',)
    search_fields = ('key',)
    readonly_fields = ('scope', 'key', 'strikes', 'updated_at')

    def has_add_permission(self, request):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(ReadOnlyAdmin):
    list_display = ('created_at', 'actor_email', 'action', 'target', 'ip_address')
    list_filter = ('action', 'created_at')
    search_fields = ('actor_email', 'action', 'target')
    date_hierarchy = 'created_at'
