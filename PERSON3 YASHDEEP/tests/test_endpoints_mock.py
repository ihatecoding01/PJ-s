import pytest
from app.config import settings

AUTH_HEADERS = {"X-Internal-Key": "test-internal-key-12345"}

def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "fairwork-ai-service"
    assert data["mock"] is True

def test_draft_contract_mock(client):
    payload = {
        "thread_messages": [
            {"sender": "0x1111111111111111111111111111111111111111", "text": "Can you build the backend?", "ts": "2026-10-10T12:00:00Z"},
            {"sender": "0x2222222222222222222222222222222222222222", "text": "Yes, for 2.0 MATIC in two milestones.", "ts": "2026-10-10T12:05:00Z"}
        ],
        "post_context": "Decentralized Escrow Platform Development",
        "parties": {
            "client": "0x1111111111111111111111111111111111111111",
            "freelancer": "0x2222222222222222222222222222222222222222"
        }
    }
    res = client.post("/ai/contract/draft", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "terms" in data
    assert "open_questions" in data
    assert "warnings" in data
    assert data["terms"]["client"] == payload["parties"]["client"].lower()
    assert data["terms"]["totalAmount"] == "2.0"
    assert len(data["terms"]["milestones"]) == 2

def test_review_contract_mock(client, valid_terms):
    payload = {"terms": valid_terms}
    res = client.post("/ai/contract/review", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "fairness_score" in data
    assert 0 <= data["fairness_score"] <= 100
    assert "flags" in data

def test_github_analyze_mock(client):
    payload = {
        "repo_url": "https://github.com/fairwork-test/escrow-demo",
        "branch": "main",
        "since": "2026-10-01T00:00:00Z",
        "until": "2026-10-10T00:00:00Z",
        "commit_sha": "a1b2c3d4",
        "milestone": {
            "title": "Core Contracts",
            "description": "Smart contract suite",
            "acceptance_criteria": [
                "Contracts compile with 0 warnings",
                "Unit tests achieve 90% coverage"
            ],
            "required_progress_bps": 8000
        }
    }
    res = client.post("/ai/github/analyze", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "progress_bps" in data
    assert 0 <= data["progress_bps"] <= 10000
    assert "confidence" in data
    assert 0.0 <= data["confidence"] <= 1.0
    assert "signals" in data
    assert "criteria_results" in data
    assert "summary" in data
    assert "risks" in data

def test_dispute_summary_mock(client, valid_terms):
    payload = {
        "terms": valid_terms,
        "milestone": valid_terms["milestones"][0],
        "submission": {
            "commit_sha": "a1b2c3d4",
            "notes": "Delivered all smart contracts with tests."
        },
        "rejection_reason": "Missing integration test suite.",
        "github_report": None,
        "evidence": [
            "Freelancer: All tests pass under npm test",
            "Client: The test suite does not include amoy integration"
        ]
    }
    res = client.post("/ai/dispute/summary", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "recommended_freelancer_share_bps" in data
    assert 0 <= data["recommended_freelancer_share_bps"] <= 10000
    assert "reasoning" in data

def test_unauthorized_internal_key(client):
    payload = {"terms": {}}
    res = client.post("/ai/contract/review", json=payload, headers={"X-Internal-Key": "wrong-key"})
    assert res.status_code == 401
    err = res.json()
    assert err["error"]["code"] == "UNAUTHORIZED"

def test_validation_error_format(client):
    # Missing required fields
    res = client.post("/ai/contract/draft", json={}, headers=AUTH_HEADERS)
    assert res.status_code == 422
    err = res.json()
    assert err["error"]["code"] == "VALIDATION_ERROR"
    assert "message" in err["error"]
