"""The /api/ask flow: question -> Groq reasoning -> stored analysis.

The Groq call is mocked (never hit the network in tests); everything
around it - dataset lookup, ownership, persistence of the analysis
record - is exercised for real against the test database.
"""
import uuid

import pandas as pd
import pytest

pytestmark = pytest.mark.ask

FAKE_ANSWER = {
    "answer": "North America has the highest total revenue (837,504.24).",
    "tool_used": "python",
    "how_calculated": {"method": "Grouped revenue by region and ranked descending."},
    "data": [{"region": "North America", "total": 837504.24}],
}


@pytest.fixture()
def mock_groq(monkeypatch):
    """Replace the Groq reasoning call with a canned response."""
    captured = {}

    def fake_answer(engine, df, table_name, profile, schema_map, question):
        captured["question"] = question
        captured["table_name"] = table_name
        return FAKE_ANSWER

    import app.routers.ask as ask_router
    monkeypatch.setattr(ask_router, "answer_question", fake_answer)
    return captured


class TestAsk:
    def test_ask_returns_answer(self, client, auth_headers, dataset_id, mock_groq):
        resp = client.post(
            "/api/ask",
            headers=auth_headers,
            json={"question": "Which region has the highest total revenue?", "dataset_id": dataset_id},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["answer"] == FAKE_ANSWER["answer"]
        assert body["tool_used"] == FAKE_ANSWER["tool_used"]
        assert body["how_calculated"] == FAKE_ANSWER["how_calculated"]
        assert body["data"] == FAKE_ANSWER["data"]

    def test_ask_passes_question_to_reasoning(self, client, auth_headers, dataset_id, mock_groq):
        question = f"Which product line grew fastest? {uuid.uuid4().hex[:8]}"
        client.post(
            "/api/ask",
            headers=auth_headers,
            json={"question": question, "dataset_id": dataset_id},
        )
        assert mock_groq["question"] == question

    def test_ask_unknown_dataset_404(self, client, auth_headers, mock_groq):
        resp = client.post(
            "/api/ask",
            headers=auth_headers,
            json={"question": "Anything?", "dataset_id": 999999},
        )
        assert resp.status_code == 404

    def test_ask_requires_auth(self, client, dataset_id, mock_groq):
        resp = client.post(
            "/api/ask",
            json={"question": "Anything?", "dataset_id": dataset_id},
        )
        assert resp.status_code == 401

    def test_ask_missing_dataset_id_422(self, client, auth_headers):
        resp = client.post(
            "/api/ask", headers=auth_headers, json={"question": "Anything?"}
        )
        assert resp.status_code == 422

    def test_ask_saves_analysis_record(self, client, auth_headers, dataset_id, mock_groq):
        question = f"Saved-record check {uuid.uuid4().hex[:8]}"
        client.post(
            "/api/ask", headers=auth_headers, json={"question": question, "dataset_id": dataset_id}
        )
        history = client.get("/api/history", headers=auth_headers)
        assert history.status_code == 200
        records = history.json() if isinstance(history.json(), list) else history.json().get("items", [])
        assert any(question == r.get("title") for r in records)
