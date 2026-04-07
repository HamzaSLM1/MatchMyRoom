"""API tests for the health check endpoint."""


class TestHealthCheck:
    def test_health_ok(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"
        assert "users" in data
