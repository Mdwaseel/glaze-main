from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Public shape of a user — never includes the password."""

    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'is_staff', 'date_joined')
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('email', 'full_name', 'password', 'password_confirm')

    def validate_email(self, value):
        value = User.objects.normalize_email(value).lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})

        # Run Django's AUTH_PASSWORD_VALIDATORS against a throwaway instance so the
        # UserAttributeSimilarityValidator can compare against email/full_name.
        user = User(email=attrs['email'], full_name=attrs.get('full_name', ''))
        try:
            validate_password(attrs['password'], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs['email'].lower(),
            password=attrs['password'],
        )
        # `authenticate` returns None for both a bad password and an inactive
        # account. One generic message avoids leaking which emails are registered.
        if user is None:
            raise serializers.ValidationError('Invalid email or password.')

        attrs['user'] = user
        return attrs


class AdminLoginSerializer(serializers.Serializer):
    """Credentials + captcha for the admin panel.

    Deliberately does NOT authenticate in validate(). The view has to run the
    lockout check first, then the captcha, then the password — in that order,
    so a locked-out or unsolved request never reaches Argon2. Doing the
    authenticate() here would invert that and make every blocked attempt cost
    a full memory-hard hash.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    # Internal provider.
    captcha_token = serializers.CharField(required=False, allow_blank=True)
    captcha_answer = serializers.CharField(required=False, allow_blank=True)
    # Hosted providers (reCAPTCHA / hCaptcha / Turnstile) return a single blob.
    captcha_response = serializers.CharField(required=False, allow_blank=True)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate_current_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})

        user = self.context['request'].user
        try:
            validate_password(attrs['new_password'], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('full_name',)
