"""Auth boundary tests — signup/login/verification are now handled by Supabase.
These tests confirm that the old custom auth endpoints are gone and that
protected endpoints correctly return 401 when no token is provided.
"""

from tests.conftest import auth_header


class TestOldAuthEndpointsRemoved:
    def test_signup_endpoint_gone(self, client):
        resp = client.post("/api/signup", json={
            "name": "Alice", "email": "alice@mcgill.ca", "password": "pass123"
        })
        assert resp.status_code == 404

    def test_login_endpoint_gone(self, client):
        resp = client.post("/api/login", json={
            "email": "alice@mcgill.ca", "password": "pass123"
        })
        assert resp.status_code == 404

    def test_verify_email_endpoint_gone(self, client):
        resp = client.post("/api/verify-email", json={"email": "x@mcgill.ca", "code": "123456"})
        assert resp.status_code == 404

    def test_resend_code_endpoint_gone(self, client):
        resp = client.post("/api/resend-verification-code", json={"email": "x@mcgill.ca"})
        assert resp.status_code == 404

    def test_forgot_password_endpoint_gone(self, client):
        resp = client.post("/api/auth/forgot-password", json={"email": "x@mcgill.ca"})
        assert resp.status_code == 404

    def test_reset_password_endpoint_gone(self, client):
        resp = client.post("/api/auth/reset-password", json={"token": "abc", "new_password": "pass123"})
        assert resp.status_code == 404


class TestUnauthenticatedAccessDenied:
    def test_get_profile_requires_auth(self, client, create_verified_user):
        user = create_verified_user(email="u@mcgill.ca")
        resp = client.get(f"/api/profile/{user.id}")
        assert resp.status_code == 401

    def test_update_profile_requires_auth(self, client, create_verified_user):
        user = create_verified_user(email="u2@mcgill.ca")
        resp = client.post(f"/api/profile/update?user_id={user.id}", json={"bio": "test"})
        assert resp.status_code == 401

    def test_submit_questionnaire_requires_auth(self, client, create_verified_user):
        user = create_verified_user(email="u3@mcgill.ca")
        resp = client.post(f"/api/questionnaire/submit?user_id={user.id}", json={"responses": {}})
        assert resp.status_code == 401

    def test_get_matches_requires_auth(self, client, create_verified_user):
        user = create_verified_user(email="u4@mcgill.ca")
        resp = client.get(f"/api/matches/{user.id}")
        assert resp.status_code == 401

    def test_send_message_requires_auth(self, client, create_verified_user):
        u1 = create_verified_user(email="u5@mcgill.ca")
        u2 = create_verified_user(email="u6@mcgill.ca")
        resp = client.post(
            f"/api/messages/send?sender_id={u1.id}",
            json={"recipient_id": str(u2.id), "content": "Hi"}
        )
        assert resp.status_code == 401


class TestInvalidToken:
    def test_tampered_token_returns_401(self, client, create_verified_user):
        user = create_verified_user(email="tamper@mcgill.ca")
        resp = client.get(
            f"/api/profile/{user.id}",
            headers={"Authorization": "Bearer invalidtoken.fake.signature"}
        )
        assert resp.status_code == 401

    def test_valid_token_accepted(self, client, create_verified_user):
        user = create_verified_user(email="valid@mcgill.ca")
        resp = client.get(f"/api/profile/{user.id}", headers=auth_header(user.id, user.email))
        assert resp.status_code == 200
