import pytest

pytestmark = pytest.mark.auth


class TestRegister:
    def test_register_returns_token_and_user(self, client):
        email = "reg-201@example.com"
        resp = client.post(
            "/api/auth/register",
            json={"email": email, "password": "secret123", "full_name": "Test User"},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["access_token"]
        assert body["token_type"] == "bearer"
        assert body["user"]["email"] == email
        assert body["user"]["full_name"] == "Test User"
        assert "hashed_password" not in body["user"]

    def test_register_duplicate_email_rejected(self, client):
        payload = {"email": "dup@example.com", "password": "secret123"}
        first = client.post("/api/auth/register", json=payload)
        assert first.status_code == 201
        second = client.post("/api/auth/register", json=payload)
        assert second.status_code == 400
        assert "already exists" in second.json()["detail"]

    def test_register_invalid_email_rejected(self, client):
        resp = client.post(
            "/api/auth/register", json={"email": "not-an-email", "password": "secret123"}
        )
        assert resp.status_code == 422

    def test_register_short_password_rejected(self, client):
        # Password policy comes from the UserCreate schema; the UI requires >= 8.
        resp = client.post(
            "/api/auth/register", json={"email": "shortpw@example.com", "password": "abc"}
        )
        assert resp.status_code == 422


class TestLogin:
    def test_login_with_valid_credentials(self, client, auth_headers):
        # auth_headers registered a user; recover the email via /me.
        me = client.get("/api/auth/me", headers=auth_headers)
        email = me.json()["email"]

        resp = client.post(
            "/api/auth/login",
            data={"username": email, "password": "secret123"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["access_token"]
        assert body["user"]["email"] == email

    def test_login_wrong_password(self, client, auth_headers):
        email = client.get("/api/auth/me", headers=auth_headers).json()["email"]
        resp = client.post(
            "/api/auth/login",
            data={"username": email, "password": "wrong-password"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password."

    def test_login_unknown_user(self, client):
        resp = client.post(
            "/api/auth/login",
            data={"username": "ghost@example.com", "password": "secret123"},
        )
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post("/api/auth/login", data={})
        assert resp.status_code == 422


class TestMe:
    def test_me_returns_current_user(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["email"].endswith("@example.com")

    def test_me_requires_token(self, client):
        assert client.get("/api/auth/me").status_code == 401

    def test_me_rejects_bad_token(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"})
        assert resp.status_code == 401
