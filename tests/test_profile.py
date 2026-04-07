"""API tests for profile endpoints."""

from tests.conftest import auth_header


class TestGetProfile:
    def test_get_own_profile(self, client, create_verified_user):
        user = create_verified_user(email="profile@mcgill.ca")
        resp = client.get(f"/api/profile/{user.id}", headers=auth_header(user.id, user.email))
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == user.id
        assert data["email"] == user.email

    def test_get_other_profile(self, client, create_verified_user):
        user1 = create_verified_user(name="One", email="one@mcgill.ca")
        user2 = create_verified_user(name="Two", email="two@mcgill.ca")
        resp = client.get(f"/api/profile/{user2.id}", headers=auth_header(user1.id, user1.email))
        assert resp.status_code == 200

    def test_get_profile_unauthenticated(self, client, create_verified_user):
        user = create_verified_user(email="noauth@mcgill.ca")
        resp = client.get(f"/api/profile/{user.id}")
        assert resp.status_code == 401

    def test_get_nonexistent_profile(self, client, create_verified_user):
        user = create_verified_user(email="exists@mcgill.ca")
        resp = client.get("/api/profile/9999", headers=auth_header(user.id, user.email))
        assert resp.status_code == 404


class TestUpdateProfile:
    def test_update_own_bio(self, client, create_verified_user):
        user = create_verified_user(email="upd@mcgill.ca")
        resp = client.post(
            f"/api/profile/update?user_id={user.id}",
            json={"bio": "Hello world"},
            headers=auth_header(user.id, user.email),
        )
        assert resp.status_code == 200

    def test_update_social_links(self, client, create_verified_user):
        user = create_verified_user(email="social@mcgill.ca")
        resp = client.post(
            f"/api/profile/update?user_id={user.id}",
            json={"social_links": {"instagram": "@test"}},
            headers=auth_header(user.id, user.email),
        )
        assert resp.status_code == 200

    def test_update_other_user_profile(self, client, create_verified_user):
        user1 = create_verified_user(name="Owner", email="owner@mcgill.ca")
        user2 = create_verified_user(name="Other", email="other@mcgill.ca")
        resp = client.post(
            f"/api/profile/update?user_id={user2.id}",
            json={"bio": "Hacked"},
            headers=auth_header(user1.id, user1.email),
        )
        assert resp.status_code == 403

    def test_update_profile_unauthenticated(self, client, create_verified_user):
        user = create_verified_user(email="noauth2@mcgill.ca")
        resp = client.post(
            f"/api/profile/update?user_id={user.id}",
            json={"bio": "No token"},
        )
        assert resp.status_code == 401
