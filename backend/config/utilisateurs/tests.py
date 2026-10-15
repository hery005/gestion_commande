from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class UserRegistrationTests(APITestCase):
    registration_url = '/api/utilisateurs/register/'
    users_url = '/api/utilisateurs/'

    def test_anonymous_user_can_register_without_assigning_privileges(self):
        response = self.client.post(
            self.registration_url,
            {
                'nomUtilisateur': 'Dupont',
                'prenomUtilisateur': 'Alex',
                'email': 'alex@example.com',
                'password': 'secure-pass-123',
                'role': 'Admin',
                'is_staff': True,
                'is_superuser': True,
            },
            format='json',
            HTTP_AUTHORIZATION='Bearer expired-token',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(email='alex@example.com')
        self.assertTrue(user.check_password('secure-pass-123'))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.role, get_user_model().Role.ACHETEUR)
        self.assertNotIn('password', response.data)

    def test_registered_user_can_log_in(self):
        self.client.post(
            self.registration_url,
            {
                'nomUtilisateur': 'Dupont',
                'prenomUtilisateur': 'Alex',
                'email': 'alex@example.com',
                'password': 'secure-pass-123',
            },
            format='json',
        )

        response = self.client.post(
            '/api/token/',
            {'email': 'alex@example.com', 'password': 'secure-pass-123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_anonymous_user_cannot_list_users(self):
        response = self.client.get(self.users_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
