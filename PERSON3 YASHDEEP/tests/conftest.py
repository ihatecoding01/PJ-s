import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure root PERSON3 YASHDEEP directory is in python sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Force MOCK mode for unit test suite by default
os.environ["MOCK"] = "true"
os.environ["AI_INTERNAL_KEY"] = "test-internal-key-12345"

from app.main import app

@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)

@pytest.fixture
def valid_terms():
    import json
    fixture_path = BASE_DIR / "tests" / "fixtures" / "sample_terms.json"
    return json.loads(fixture_path.read_text(encoding="utf-8"))
