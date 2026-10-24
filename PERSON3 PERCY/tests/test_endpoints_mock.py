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

def test_clarity_linter_and_risk_auditor_mock(client):
    payload = {
        "terms": {
            "schemaVersion": "1.0",
            "title": "Website Design",
            "description": "Design test",
            "client": "0x1111111111111111111111111111111111111111",
            "freelancer": "0x2222222222222222222222222222222222222222",
            "currency": "ETH",
            "totalAmount": "1.0",
            "paymentMode": "MILESTONE",
            "latePenaltyBpsPerDay": 600,
            "maxLatePenaltyBps": 6000,
            "reviewWindowDays": 5,
            "graceDays": 3,
            "maxRevisions": 2,
            "github": {"repoUrl": "https://github.com/example/repo", "branch": "main"},
            "milestones": [
                {
                    "index": 0,
                    "title": "Frontend",
                    "description": "Build UI",
                    "amount": "1.0",
                    "deadline": "2026-11-01T00:00:00Z",
                    "requiredProgressBps": 8000,
                    "acceptanceCriteria": ["Make clean code and nice UI"]
                }
            ]
        }
    }
    res = client.post("/ai/contract/review", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["fairness_score"] < 70
    assert "summary" in data and len(data["summary"]) > 0
    flags = data["flags"]
    assert len(flags) >= 3

    # Check for suggested rewrites on vague criteria
    criteria_flags = [f for f in flags if "acceptanceCriteria" in f["clause"]]
    assert len(criteria_flags) >= 2
    rewrites = [f["suggested_rewrite"] for f in criteria_flags if f.get("suggested_rewrite")]
    assert len(rewrites) >= 2
    # Check that clean code rewrite and nice ui rewrite are present
    assert any("ESLint" in r or "Pylint" in r for r in rewrites)
    assert any("responsive layout" in r for r in rewrites)

    # Check penalty flags
    critical_flags = [f for f in flags if f.get("severity") == "CRITICAL"]
    assert len(critical_flags) >= 2
    penalty_clauses = [f["clause"] for f in critical_flags]
    assert "latePenaltyBpsPerDay" in penalty_clauses
    assert "maxLatePenaltyBps" in penalty_clauses

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

def test_plan_from_brief_mock(client):
    payload = {
        "brief": "Build a decentralized crowdfunding dApp on Polygon with milestone payouts.",
        "total_budget": 3.0,
        "currency": "MATIC",
        "client_address": "0x1111111111111111111111111111111111111111",
        "freelancer_address": "0x2222222222222222222222222222222222222222"
    }
    res = client.post("/ai/contract/plan-from-brief", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "terms" in data
    assert "rationale" in data
    assert "suggested_tech_stack" in data
    assert data["terms"]["totalAmount"] == "3.0"
    assert data["terms"]["currency"] == "MATIC"
    assert len(data["terms"]["milestones"]) == 2
    # Check that milestone amounts sum to totalAmount
    total_ms = sum(float(m["amount"]) for m in data["terms"]["milestones"])
    assert total_ms == 3.0
