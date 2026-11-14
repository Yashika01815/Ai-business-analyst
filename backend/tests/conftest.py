"""
Shared test fixtures.

The app is imported with environment variables set so that:
- the database is a temporary SQLite file (never the real Supabase / dev DB)
- the automation scheduler is off (no background threads during tests)
"""
import os
import tempfile

_tmpdir = tempfile.mkdtemp(prefix="aba-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmpdir}/test.db"
os.environ["ENABLE_SCHEDULER"] = "false"
os.environ["ENV"] = "test"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _unique_email():
    import uuid
    return f"user-{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture()
def auth_headers(client):
    """Register a fresh user and return Authorization headers."""
    email = _unique_email()
    resp = client.post(
        "/api/auth/register",
        json={"email": email, "password": "secret123"},
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def dataset_id(client, auth_headers):
    """Load the sample sales dataset for the test user."""
    resp = client.post("/api/sample/sales", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]
