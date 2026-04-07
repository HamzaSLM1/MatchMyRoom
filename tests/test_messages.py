"""API tests for messaging endpoints."""

from tests.conftest import auth_header


class TestSendMessage:
    def test_send_message(self, client, create_verified_user):
        u1 = create_verified_user(name="Sender", email="sender@mcgill.ca")
        u2 = create_verified_user(name="Receiver", email="receiver@mcgill.ca")
        resp = client.post(
            f"/api/messages/send?sender_id={u1.id}",
            json={"recipient_id": u2.id, "content": "Hey there!"},
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        assert resp.json()["message_id"] > 0

    def test_send_message_to_self(self, client, create_verified_user):
        u = create_verified_user(email="selfmsg@mcgill.ca")
        resp = client.post(
            f"/api/messages/send?sender_id={u.id}",
            json={"recipient_id": u.id, "content": "Talking to myself"},
            headers=auth_header(u.id, u.email),
        )
        assert resp.status_code == 400

    def test_send_message_to_nonexistent(self, client, create_verified_user):
        u = create_verified_user(email="msgnoone@mcgill.ca")
        resp = client.post(
            f"/api/messages/send?sender_id={u.id}",
            json={"recipient_id": 9999, "content": "Hello?"},
            headers=auth_header(u.id, u.email),
        )
        assert resp.status_code == 404

    def test_send_as_another_user(self, client, create_verified_user):
        u1 = create_verified_user(name="Real2", email="real2@mcgill.ca")
        u2 = create_verified_user(name="Fake2", email="fake2@mcgill.ca")
        u3 = create_verified_user(name="Recv", email="recv@mcgill.ca")
        resp = client.post(
            f"/api/messages/send?sender_id={u2.id}",
            json={"recipient_id": u3.id, "content": "Impersonating"},
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 403

    def test_send_unauthenticated(self, client, create_verified_user):
        u1 = create_verified_user(email="noauth7@mcgill.ca")
        u2 = create_verified_user(email="noauth8@mcgill.ca")
        resp = client.post(
            f"/api/messages/send?sender_id={u1.id}",
            json={"recipient_id": u2.id, "content": "No token"},
        )
        assert resp.status_code == 401

    def test_send_empty_message(self, client, create_verified_user):
        u1 = create_verified_user(name="Empty1", email="empty1@mcgill.ca")
        u2 = create_verified_user(name="Empty2", email="empty2@mcgill.ca")
        resp = client.post(
            f"/api/messages/send?sender_id={u1.id}",
            json={"recipient_id": u2.id, "content": ""},
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 422


class TestGetConversations:
    def test_get_conversations(self, client, create_verified_user):
        u1 = create_verified_user(name="Conv1", email="conv1@mcgill.ca")
        u2 = create_verified_user(name="Conv2", email="conv2@mcgill.ca")
        # Send a message to create a conversation
        client.post(
            f"/api/messages/send?sender_id={u1.id}",
            json={"recipient_id": u2.id, "content": "Hi!"},
            headers=auth_header(u1.id, u1.email),
        )
        resp = client.get(
            f"/api/messages/conversations/{u1.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["user_id"] == u2.id

    def test_get_conversations_other_user(self, client, create_verified_user):
        u1 = create_verified_user(name="NoConv1", email="noconv1@mcgill.ca")
        u2 = create_verified_user(name="NoConv2", email="noconv2@mcgill.ca")
        resp = client.get(
            f"/api/messages/conversations/{u2.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 403


class TestGetMessageThread:
    def test_get_thread(self, client, create_verified_user):
        u1 = create_verified_user(name="Thread1", email="thread1@mcgill.ca")
        u2 = create_verified_user(name="Thread2", email="thread2@mcgill.ca")
        client.post(
            f"/api/messages/send?sender_id={u1.id}",
            json={"recipient_id": u2.id, "content": "First"},
            headers=auth_header(u1.id, u1.email),
        )
        client.post(
            f"/api/messages/send?sender_id={u2.id}",
            json={"recipient_id": u1.id, "content": "Reply"},
            headers=auth_header(u2.id, u2.email),
        )
        resp = client.get(
            f"/api/messages/thread/{u1.id}/{u2.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["content"] == "First"
        assert data[1]["content"] == "Reply"

    def test_thread_marks_as_read(self, client, create_verified_user):
        u1 = create_verified_user(name="Read1", email="read1@mcgill.ca")
        u2 = create_verified_user(name="Read2", email="read2@mcgill.ca")
        # u2 sends to u1
        client.post(
            f"/api/messages/send?sender_id={u2.id}",
            json={"recipient_id": u1.id, "content": "Unread message"},
            headers=auth_header(u2.id, u2.email),
        )
        # u1 opens the thread — should mark u2's messages as read
        resp = client.get(
            f"/api/messages/thread/{u1.id}/{u2.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        # Check conversations — unread count should be 0
        conv_resp = client.get(
            f"/api/messages/conversations/{u1.id}",
            headers=auth_header(u1.id, u1.email),
        )
        data = conv_resp.json()
        assert len(data) == 1
        assert data[0]["unread_count"] == 0

    def test_get_thread_other_user(self, client, create_verified_user):
        u1 = create_verified_user(name="NoThread1", email="nothread1@mcgill.ca")
        u2 = create_verified_user(name="NoThread2", email="nothread2@mcgill.ca")
        u3 = create_verified_user(name="NoThread3", email="nothread3@mcgill.ca")
        resp = client.get(
            f"/api/messages/thread/{u2.id}/{u3.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 403


class TestMarkMessageRead:
    def test_mark_read(self, client, create_verified_user):
        u1 = create_verified_user(name="MR1", email="mr1@mcgill.ca")
        u2 = create_verified_user(name="MR2", email="mr2@mcgill.ca")
        send_resp = client.post(
            f"/api/messages/send?sender_id={u1.id}",
            json={"recipient_id": u2.id, "content": "Mark me"},
            headers=auth_header(u1.id, u1.email),
        )
        msg_id = send_resp.json()["message_id"]
        resp = client.post(
            f"/api/messages/mark-read/{msg_id}",
            headers=auth_header(u2.id, u2.email),
        )
        assert resp.status_code == 200

    def test_mark_read_not_recipient(self, client, create_verified_user):
        u1 = create_verified_user(name="MR3", email="mr3@mcgill.ca")
        u2 = create_verified_user(name="MR4", email="mr4@mcgill.ca")
        send_resp = client.post(
            f"/api/messages/send?sender_id={u1.id}",
            json={"recipient_id": u2.id, "content": "Not your msg"},
            headers=auth_header(u1.id, u1.email),
        )
        msg_id = send_resp.json()["message_id"]
        # u1 (sender) tries to mark as read — should fail
        resp = client.post(
            f"/api/messages/mark-read/{msg_id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 403

    def test_mark_read_nonexistent(self, client, create_verified_user):
        u = create_verified_user(email="mr5@mcgill.ca")
        resp = client.post(
            f"/api/messages/mark-read/9999",
            headers=auth_header(u.id, u.email),
        )
        assert resp.status_code == 404
