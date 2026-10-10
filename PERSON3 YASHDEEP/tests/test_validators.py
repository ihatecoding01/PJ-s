import copy
from datetime import datetime, timezone
import pytest
from app.services.validator import validate_agreement_terms, attempt_best_effort_repair

REF_TIME = datetime.fromisoformat("2026-10-10T00:00:00+00:00")

def test_validate_clean_terms(valid_terms):
    sanitized, errors, assumptions = validate_agreement_terms(valid_terms, reference_time=REF_TIME)
    assert len(errors) == 0
    assert sanitized["client"] == valid_terms["client"].lower()
    assert sanitized["freelancer"] == valid_terms["freelancer"].lower()
    assert sanitized["totalAmount"] == "1.5"
    assert len(sanitized["milestones"]) == 2

def test_validate_milestone_sum_mismatch(valid_terms):
    bad_terms = copy.deepcopy(valid_terms)
    bad_terms["totalAmount"] = "2.5"  # Milestones are 0.5 + 1.0 = 1.5 != 2.5
    sanitized, errors, assumptions = validate_agreement_terms(bad_terms, reference_time=REF_TIME)
    assert any("sum" in e.lower() for e in errors)

def test_validate_deadlines_must_be_future(valid_terms):
    bad_terms = copy.deepcopy(valid_terms)
    # Set deadline before reference time
    bad_terms["milestones"][0]["deadline"] = "2026-10-01T00:00:00Z"
    sanitized, errors, assumptions = validate_agreement_terms(bad_terms, reference_time=REF_TIME)
    assert any("past" in e.lower() for e in errors)

def test_validate_deadlines_strictly_increasing(valid_terms):
    bad_terms = copy.deepcopy(valid_terms)
    # Set milestone 1 deadline earlier than milestone 0
    bad_terms["milestones"][0]["deadline"] = "2026-11-20T00:00:00Z"
    bad_terms["milestones"][1]["deadline"] = "2026-11-10T00:00:00Z"
    sanitized, errors, assumptions = validate_agreement_terms(bad_terms, reference_time=REF_TIME)
    assert any("strictly after" in e.lower() for e in errors)

def test_validate_lump_sum_must_have_single_milestone(valid_terms):
    bad_terms = copy.deepcopy(valid_terms)
    bad_terms["paymentMode"] = "LUMP_SUM"  # Has 2 milestones
    sanitized, errors, assumptions = validate_agreement_terms(bad_terms, reference_time=REF_TIME)
    assert any("exactly 1 milestone" in e.lower() for e in errors)

def test_validate_empty_acceptance_criteria(valid_terms):
    bad_terms = copy.deepcopy(valid_terms)
    bad_terms["milestones"][0]["acceptanceCriteria"] = []
    sanitized, errors, assumptions = validate_agreement_terms(bad_terms, reference_time=REF_TIME)
    assert any("acceptance criterion" in e.lower() for e in errors)

def test_validate_uppercase_addresses_lowercased(valid_terms):
    bad_terms = copy.deepcopy(valid_terms)
    bad_terms["client"] = "0xABCDEF1111111111111111111111111111111111"
    sanitized, errors, assumptions = validate_agreement_terms(bad_terms, reference_time=REF_TIME)
    assert sanitized["client"] == "0xabcdef1111111111111111111111111111111111"

def test_validate_bps_out_of_range(valid_terms):
    bad_terms = copy.deepcopy(valid_terms)
    bad_terms["latePenaltyBpsPerDay"] = 15000  # > 10000
    sanitized, errors, assumptions = validate_agreement_terms(bad_terms, reference_time=REF_TIME)
    assert any("basis points range" in e.lower() for e in errors)

def test_attempt_best_effort_repair():
    broken_terms = {
        "paymentMode": "LUMP_SUM",
        "milestones": [
            {"amount": "0.5", "deadline": "2020-01-01T00:00:00Z"},
            {"amount": "1.0", "deadline": "2020-02-01T00:00:00Z"}
        ]
    }
    repaired, warnings = attempt_best_effort_repair(broken_terms, reference_time=REF_TIME)
    assert repaired["paymentMode"] == "LUMP_SUM"
    assert len(repaired["milestones"]) == 1
    assert repaired["totalAmount"] == "1.5"
    assert len(warnings) > 0
