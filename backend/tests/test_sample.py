"""Sample-data loading and ownership of datasets."""
import pytest

pytestmark = pytest.mark.sample


class TestListSamples:
    def test_list_samples_public(self, client):
        resp = client.get("/api/sample")
        assert resp.status_code == 200
        keys = set(resp.json().keys())
        assert {"sales", "marketing", "customers"} == keys

    def test_list_unknown_sample_shape(self, client):
        body = client.get("/api/sample").json()
        for meta in body.values():
            assert set(meta.keys()) == {"file", "label"}


class TestLoadSample:
    def test_load_sales_sample(self, client, auth_headers):
        resp = client.post("/api/sample/sales", headers=auth_headers)
        assert resp.status_code == 200
        ds = resp.json()
        assert ds["id"] > 0
        assert ds["row_count"] == 2416
        assert ds["column_count"] > 0
        assert ds["original_filename"] == "sales.csv"
        assert ds["data_quality_score"] > 0

    def test_load_unknown_sample_404(self, client, auth_headers):
        resp = client.post("/api/sample/does-not-exist", headers=auth_headers)
        assert resp.status_code == 404

    def test_load_sample_requires_auth(self, client):
        resp = client.post("/api/sample/sales")
        assert resp.status_code == 401

    def test_dataset_is_private_to_owner(self, client, auth_headers, dataset_id):
        # Another user must not see (or ask about) the first user's dataset.
        other_headers = auth_headers_factory(client)
        resp = client.get(f"/api/datasets/{dataset_id}", headers=other_headers)
        assert resp.status_code in (401, 403, 404)

    def test_owner_sees_own_dataset(self, client, auth_headers, dataset_id):
        resp = client.get(f"/api/datasets/{dataset_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == dataset_id


def auth_headers_factory(client):
    import uuid
    email = f"other-{uuid.uuid4().hex[:10]}@example.com"
    resp = client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
