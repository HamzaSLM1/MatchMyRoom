"""API tests for questionnaire endpoints."""

from tests.conftest import auth_header, sample_questionnaire_responses


class TestSubmitQuestionnaire:
    def test_submit_success(self, client, create_verified_user):
        user = create_verified_user(email="quest@mcgill.ca")
        resp = client.post(
            f"/api/questionnaire/submit?user_id={user.id}",
            json={"responses": sample_questionnaire_responses()},
            headers=auth_header(user.id, user.email),
        )
        assert resp.status_code == 200
        assert "successfully" in resp.json()["message"]

    def test_submit_updates_existing(self, client, create_verified_user):
        user = create_verified_user(email="update@mcgill.ca")
        headers = auth_header(user.id, user.email)
        url = f"/api/questionnaire/submit?user_id={user.id}"

        client.post(url, json={"responses": sample_questionnaire_responses()}, headers=headers)
        # Submit again — should update, not fail
        new_responses = sample_questionnaire_responses()
        new_responses["budget"] = 3
        resp = client.post(url, json={"responses": new_responses}, headers=headers)
        assert resp.status_code == 200

    def test_submit_for_another_user(self, client, create_verified_user):
        user1 = create_verified_user(name="Me", email="me@mcgill.ca")
        user2 = create_verified_user(name="Not Me", email="notme@mcgill.ca")
        resp = client.post(
            f"/api/questionnaire/submit?user_id={user2.id}",
            json={"responses": sample_questionnaire_responses()},
            headers=auth_header(user1.id, user1.email),
        )
        assert resp.status_code == 403

    def test_submit_unauthenticated(self, client, create_verified_user):
        user = create_verified_user(email="noauth3@mcgill.ca")
        resp = client.post(
            f"/api/questionnaire/submit?user_id={user.id}",
            json={"responses": sample_questionnaire_responses()},
        )
        assert resp.status_code == 401
