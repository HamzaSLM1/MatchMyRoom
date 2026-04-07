"""API tests for swipe/like endpoints."""

from tests.conftest import auth_header


class TestSwipeLike:
    def test_like_user(self, client, create_verified_user):
        u1 = create_verified_user(name="Liker", email="liker@mcgill.ca")
        u2 = create_verified_user(name="Liked", email="liked@mcgill.ca")
        resp = client.post(
            f"/api/swipes/like?user_id={u1.id}",
            json={"liked_user_id": u2.id, "is_like": True},
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        assert resp.json()["is_mutual_match"] is False

    def test_pass_user(self, client, create_verified_user):
        u1 = create_verified_user(name="Passer", email="passer@mcgill.ca")
        u2 = create_verified_user(name="Passed", email="passed@mcgill.ca")
        resp = client.post(
            f"/api/swipes/like?user_id={u1.id}",
            json={"liked_user_id": u2.id, "is_like": False},
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        assert resp.json()["is_mutual_match"] is False

    def test_like_self(self, client, create_verified_user):
        u = create_verified_user(email="self@mcgill.ca")
        resp = client.post(
            f"/api/swipes/like?user_id={u.id}",
            json={"liked_user_id": u.id, "is_like": True},
            headers=auth_header(u.id, u.email),
        )
        assert resp.status_code == 400

    def test_like_nonexistent_user(self, client, create_verified_user):
        u = create_verified_user(email="ghost@mcgill.ca")
        resp = client.post(
            f"/api/swipes/like?user_id={u.id}",
            json={"liked_user_id": 9999, "is_like": True},
            headers=auth_header(u.id, u.email),
        )
        assert resp.status_code == 404

    def test_like_already_swiped(self, client, create_verified_user):
        u1 = create_verified_user(name="Dup1", email="dup1@mcgill.ca")
        u2 = create_verified_user(name="Dup2", email="dup2@mcgill.ca")
        headers = auth_header(u1.id, u1.email)
        client.post(
            f"/api/swipes/like?user_id={u1.id}",
            json={"liked_user_id": u2.id, "is_like": True},
            headers=headers,
        )
        resp = client.post(
            f"/api/swipes/like?user_id={u1.id}",
            json={"liked_user_id": u2.id, "is_like": True},
            headers=headers,
        )
        assert resp.status_code == 400

    def test_mutual_match(self, client, create_verified_user):
        u1 = create_verified_user(name="Mutual1", email="mutual1@mcgill.ca")
        u2 = create_verified_user(name="Mutual2", email="mutual2@mcgill.ca")
        # u1 likes u2
        client.post(
            f"/api/swipes/like?user_id={u1.id}",
            json={"liked_user_id": u2.id, "is_like": True},
            headers=auth_header(u1.id, u1.email),
        )
        # u2 likes u1 back
        resp = client.post(
            f"/api/swipes/like?user_id={u2.id}",
            json={"liked_user_id": u1.id, "is_like": True},
            headers=auth_header(u2.id, u2.email),
        )
        assert resp.status_code == 200
        assert resp.json()["is_mutual_match"] is True

    def test_swipe_as_another_user(self, client, create_verified_user):
        u1 = create_verified_user(name="Real", email="real@mcgill.ca")
        u2 = create_verified_user(name="Fake", email="fake@mcgill.ca")
        u3 = create_verified_user(name="Target", email="tgt@mcgill.ca")
        resp = client.post(
            f"/api/swipes/like?user_id={u2.id}",
            json={"liked_user_id": u3.id, "is_like": True},
            headers=auth_header(u1.id, u1.email),  # u1 pretending to be u2
        )
        assert resp.status_code == 403

    def test_swipe_unauthenticated(self, client, create_verified_user):
        u1 = create_verified_user(email="noauth5@mcgill.ca")
        u2 = create_verified_user(email="noauth6@mcgill.ca")
        resp = client.post(
            f"/api/swipes/like?user_id={u1.id}",
            json={"liked_user_id": u2.id, "is_like": True},
        )
        assert resp.status_code == 401


class TestCheckLike:
    def test_check_like_exists(self, client, create_verified_user):
        u1 = create_verified_user(name="C1", email="c1@mcgill.ca")
        u2 = create_verified_user(name="C2", email="c2@mcgill.ca")
        client.post(
            f"/api/swipes/like?user_id={u1.id}",
            json={"liked_user_id": u2.id, "is_like": True},
            headers=auth_header(u1.id, u1.email),
        )
        resp = client.get(
            f"/api/swipes/check-like/{u1.id}/{u2.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        assert resp.json()["has_liked"] is True

    def test_check_like_not_exists(self, client, create_verified_user):
        u1 = create_verified_user(name="C3", email="c3@mcgill.ca")
        u2 = create_verified_user(name="C4", email="c4@mcgill.ca")
        resp = client.get(
            f"/api/swipes/check-like/{u1.id}/{u2.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        assert resp.json()["has_liked"] is False

    def test_check_like_other_user(self, client, create_verified_user):
        u1 = create_verified_user(name="C5", email="c5@mcgill.ca")
        u2 = create_verified_user(name="C6", email="c6@mcgill.ca")
        u3 = create_verified_user(name="C7", email="c7@mcgill.ca")
        resp = client.get(
            f"/api/swipes/check-like/{u2.id}/{u3.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 403
