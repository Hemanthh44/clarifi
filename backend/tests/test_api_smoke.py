from fastapi.testclient import TestClient

from app.main import app


def test_scam_endpoint_smoke():
    with TestClient(app) as client:
        response = client.post(
            "/api/scam/analyze",
            json={"message": "Guaranteed 50% return. Send money now on WhatsApp."},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "High Risk"
    assert data["flags"]


def test_product_document_and_explainer_smoke(monkeypatch):
    # Storage is an external Supabase service in production; keep this smoke
    # test deterministic and network-free by replacing the upload operation.
    monkeypatch.setattr("app.routers.documents.upload_bytes", lambda *args, **kwargs: None)
    with TestClient(app) as client:
        upload = client.post(
            "/api/documents",
            files={
                "file": (
                    "demo-fund.txt",
                    b"Investment objective: growth. Key risk: market risk. Exit load: 1%.",
                    "text/plain",
                )
            },
            data={"category": "Product Explainer"},
        )
        assert upload.status_code == 200
        document = upload.json()

        response = client.post(
            "/api/product-explainer/ask",
            json={
                "message": "What is the key risk?",
                "document_id": document["id"],
                "action": "risks",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["sources"]
    assert data["compliance"]["source_grounded"] is True
