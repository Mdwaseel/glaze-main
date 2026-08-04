from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()

ACCESS = 'glaze_access'
REFRESH = 'glaze_refresh'

PASSWORD = 'Sup3rSecret!pass'


class AuthFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def register(self, email='new@glaze.test'):
        return self.client.post(
            reverse('account:register'),
            {
                'email': email,
                'full_name': 'New User',
                'password': PASSWORD,
                'password_confirm': PASSWORD,
            },
            format='json',
        )

    # --- register ---------------------------------------------------

    def test_register_creates_user_and_sets_cookies(self):
        response = self.register()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['user']['email'], 'new@glaze.test')
        self.assertNotIn('password', response.data['user'])

        self.assertIn(ACCESS, response.cookies)
        self.assertIn(REFRESH, response.cookies)
        self.assertTrue(response.cookies[ACCESS]['httponly'])
        self.assertTrue(response.cookies[REFRESH]['httponly'])
        self.assertEqual(response.cookies[REFRESH]['path'], '/api/v1/auth/')
        self.assertTrue(User.objects.filter(email='new@glaze.test').exists())

    def test_register_rejects_mismatched_passwords(self):
        response = self.client.post(
            reverse('account:register'),
            {
                'email': 'x@glaze.test',
                'password': PASSWORD,
                'password_confirm': 'something-else',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('password_confirm', response.data)

    def test_register_rejects_weak_password(self):
        response = self.client.post(
            reverse('account:register'),
            {'email': 'x@glaze.test', 'password': '12345', 'password_confirm': '12345'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(email='dup@glaze.test', password=PASSWORD)
        response = self.register(email='dup@glaze.test')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)

    # --- login ------------------------------------------------------

    def test_login_sets_cookies(self):
        User.objects.create_user(email='a@glaze.test', password=PASSWORD)
        response = self.client.post(
            reverse('account:login'),
            {'email': 'a@glaze.test', 'password': PASSWORD},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn(ACCESS, response.cookies)
        self.assertIn(REFRESH, response.cookies)
        # The tokens must never appear in the response body.
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)

    def test_login_with_wrong_password_fails(self):
        User.objects.create_user(email='a@glaze.test', password=PASSWORD)
        response = self.client.post(
            reverse('account:login'),
            {'email': 'a@glaze.test', 'password': 'wrong'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotIn(ACCESS, response.cookies)

    def test_inactive_user_cannot_login(self):
        User.objects.create_user(email='a@glaze.test', password=PASSWORD, is_active=False)
        response = self.client.post(
            reverse('account:login'),
            {'email': 'a@glaze.test', 'password': PASSWORD},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    # --- me ---------------------------------------------------------

    def test_me_requires_authentication(self):
        self.assertEqual(self.client.get(reverse('account:me')).status_code, 401)

    def test_me_returns_current_user_from_cookie(self):
        self.register()
        response = self.client.get(reverse('account:me'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], 'new@glaze.test')

    def test_me_patch_updates_profile(self):
        self.register()
        response = self.client.patch(
            reverse('account:me'), {'full_name': 'Renamed'}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['full_name'], 'Renamed')

    def test_tampered_access_cookie_is_rejected(self):
        self.register()
        self.client.cookies[ACCESS] = 'not-a-real-jwt'
        self.assertEqual(self.client.get(reverse('account:me')).status_code, 401)

    # --- refresh ----------------------------------------------------

    def test_refresh_issues_new_cookies(self):
        self.register()
        old_refresh = self.client.cookies[REFRESH].value

        response = self.client.post(reverse('account:refresh'))
        self.assertEqual(response.status_code, 200)
        self.assertIn(ACCESS, response.cookies)
        # ROTATE_REFRESH_TOKENS is on, so a new refresh cookie is handed back.
        self.assertIn(REFRESH, response.cookies)
        self.assertNotEqual(response.cookies[REFRESH].value, old_refresh)

    def test_rotated_refresh_token_cannot_be_reused(self):
        self.register()
        old_refresh = self.client.cookies[REFRESH].value

        self.client.post(reverse('account:refresh'))

        self.client.cookies[REFRESH] = old_refresh
        response = self.client.post(reverse('account:refresh'))
        self.assertEqual(response.status_code, 401)

    def test_refresh_without_cookie_fails(self):
        self.assertEqual(self.client.post(reverse('account:refresh')).status_code, 401)

    # --- logout -----------------------------------------------------

    def test_logout_clears_cookies_and_blacklists_refresh(self):
        self.register()
        stolen_refresh = self.client.cookies[REFRESH].value

        response = self.client.post(reverse('account:logout'))
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.cookies[ACCESS].value, '')
        self.assertEqual(response.cookies[REFRESH].value, '')

        # Even a copy of the old refresh token is now useless.
        self.client.cookies[REFRESH] = stolen_refresh
        self.assertEqual(self.client.post(reverse('account:refresh')).status_code, 401)

    # --- change password --------------------------------------------

    def test_change_password_rotates_cookies(self):
        self.register()
        new_password = 'An0therGoodPass!'

        response = self.client.post(
            reverse('account:password-change'),
            {
                'current_password': PASSWORD,
                'new_password': new_password,
                'new_password_confirm': new_password,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn(ACCESS, response.cookies)

        user = User.objects.get(email='new@glaze.test')
        self.assertTrue(user.check_password(new_password))

    def test_change_password_requires_correct_current_password(self):
        self.register()
        response = self.client.post(
            reverse('account:password-change'),
            {
                'current_password': 'nope',
                'new_password': 'An0therGoodPass!',
                'new_password_confirm': 'An0therGoodPass!',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('current_password', response.data)


class UserModelTests(TestCase):
    def test_create_user_normalizes_email_and_hashes_password(self):
        user = User.objects.create_user(email='Mixed@GLAZE.test', password=PASSWORD)
        self.assertEqual(user.email, 'Mixed@glaze.test')
        self.assertNotEqual(user.password, PASSWORD)
        self.assertTrue(user.check_password(PASSWORD))

    def test_create_user_requires_email(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email='', password=PASSWORD)

    def test_create_superuser(self):
        admin = User.objects.create_superuser(email='admin@glaze.test', password=PASSWORD)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
