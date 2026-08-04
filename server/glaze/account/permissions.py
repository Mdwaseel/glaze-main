"""Permission classes for the admin panel API."""

from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaff(BasePermission):
    """Admin-panel access: authenticated AND is_staff.

    DRF's own IsAdminUser is the same check, but this exists under a name the
    project controls so the rule can grow (an `is_active` re-check, a role
    field) in one place rather than being swapped at every call site.
    """

    message = 'Administrator access is required.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_staff)


class IsStaffOrReadOnly(BasePermission):
    """Anyone may read; only staff may write.

    Used by the public blog endpoints, where GET is open to the world and
    every mutating method belongs to the admin panel.
    """

    message = 'Administrator access is required to make changes.'

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_staff)
