"""API tests for questionnaire endpoints."""

from tests.conftest import auth_header, sample_questionnaire_responses
from backend.app.models import QuestionnaireResponse, Match


class TestSubmitQuestionnaire:
    def test_retake_replaces_preferences_and_removes_old_match(self, client, db_session, create_user_with_questionnaire):
        first = create_user_with_questionnaire(name="First", email="retakefirst@mcgill.ca")
        second = create_user_with_questionnaire(name="Second", email="retakesecond@mcgill.ca")
        client.post(f"/api/matches/calculate?user_id={first.id}", headers=auth_header(first.id, first.email))
        assert db_session.query(Match).count() == 1

        changed = sample_questionnaire_responses()
        changed.update({"gender": 1, "genderPreference": 0, "budget": 3, "location": 4,
                        "sleepSchedule": 0, "cleanliness": 0, "noise": 0, "guests": 0, "study": 0,
                        "pets": 0})
        response = client.post(
            f"/api/questionnaire/submit?user_id={second.id}",
            json={"responses": changed},
            headers=auth_header(second.id, second.email),
        )
        assert response.status_code == 200
        saved = db_session.query(QuestionnaireResponse).filter_by(user_id=second.id).one().responses
        assert saved["gender"] == 1
        assert "genderPreference" not in saved
        assert db_session.query(Match).count() == 0

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
