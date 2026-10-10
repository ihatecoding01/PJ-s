import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, List, Tuple, Optional

# Sensible defaults mandated by Common Context
DEFAULT_VALUES = {
    "latePenaltyBpsPerDay": 100,
    "maxLatePenaltyBps": 3000,
    "reviewWindowDays": 5,
    "graceDays": 3,
    "maxRevisions": 2,
    "currency": "MATIC",
    "schemaVersion": "1.0",
    "requiredProgressBps": 8000,
}

VAGUE_CRITERIA_WORDS = [
    "good quality", "clean code", "well written", "nice looking",
    "high performance", "best practices", "satisfactory", "properly done"
]

def parse_iso_datetime(dt_str: str) -> Optional[datetime]:
    """Parses ISO-8601 string to timezone-aware UTC datetime."""
    if not isinstance(dt_str, str):
        return None
    try:
        # Handle trailing Z
        s = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None

def validate_agreement_terms(terms_data: Dict[str, Any], reference_time: Optional[datetime] = None) -> Tuple[Dict[str, Any], List[str], List[str]]:
    """
    Deterministically validates agreement terms.
    Returns:
      (sanitized_terms, validation_errors, assumed_warnings)
    If validation_errors is empty, terms_data is fully compliant.
    """
    errors: List[str] = []
    assumptions: List[str] = []
    terms = dict(terms_data)

    now = reference_time or datetime.now(timezone.utc)

    # 1. Schema version & currency defaults
    if not terms.get("schemaVersion"):
        terms["schemaVersion"] = DEFAULT_VALUES["schemaVersion"]
    if not terms.get("currency"):
        terms["currency"] = DEFAULT_VALUES["currency"]
        assumptions.append(f"Currency was not specified; assumed default '{DEFAULT_VALUES['currency']}'.")

    # 2. Addresses normalization (must be lowercase)
    for party in ("client", "freelancer"):
        addr = terms.get(party, "")
        if not isinstance(addr, str) or not addr.startswith("0x") or len(addr) < 42:
            errors.append(f"Field '{party}' must be a valid 0x hex address, got '{addr}'.")
        else:
            terms[party] = addr.lower()

    # 3. Numeric defaults & ranges
    for key in ("latePenaltyBpsPerDay", "maxLatePenaltyBps", "reviewWindowDays", "graceDays", "maxRevisions"):
        val = terms.get(key)
        if val is None:
            terms[key] = DEFAULT_VALUES[key]
            assumptions.append(f"Field '{key}' was not discussed; assumed default value {DEFAULT_VALUES[key]}.")
        else:
            try:
                int_val = int(val)
                terms[key] = int_val
                if "Bps" in key and (int_val < 0 or int_val > 10000):
                    errors.append(f"Field '{key}' must be within basis points range 0-10000, got {int_val}.")
                elif "Days" in key and int_val < 0:
                    errors.append(f"Field '{key}' must be non-negative, got {int_val}.")
            except (ValueError, TypeError):
                errors.append(f"Field '{key}' must be an integer, got '{val}'.")

    # 4. Total Amount validation
    total_amount_str = str(terms.get("totalAmount", "")).strip()
    total_decimal = None
    try:
        total_decimal = Decimal(total_amount_str)
        if total_decimal <= Decimal("0"):
            errors.append(f"Field 'totalAmount' must be strictly positive, got '{total_amount_str}'.")
        terms["totalAmount"] = str(total_decimal)
    except (InvalidOperation, TypeError):
        errors.append(f"Field 'totalAmount' must be a valid decimal string, got '{total_amount_str}'.")

    # 5. Payment Mode
    payment_mode = terms.get("paymentMode")
    if payment_mode not in ("MILESTONE", "LUMP_SUM"):
        errors.append(f"Field 'paymentMode' must be 'MILESTONE' or 'LUMP_SUM', got '{payment_mode}'.")

    # 6. GitHub details
    github_info = terms.get("github")
    if not isinstance(github_info, dict) or not github_info.get("repoUrl"):
        errors.append("Field 'github' must be an object containing a non-empty 'repoUrl'.")
    else:
        if not github_info.get("branch"):
            github_info["branch"] = "main"
            assumptions.append("GitHub branch was not specified; assumed 'main'.")
        terms["github"] = github_info

    # 7. Milestones validation
    milestones = terms.get("milestones")
    if not isinstance(milestones, list) or len(milestones) == 0:
        errors.append("Agreement must contain at least one milestone.")
        return terms, errors, assumptions

    if payment_mode == "LUMP_SUM" and len(milestones) != 1:
        errors.append(f"Payment mode 'LUMP_SUM' must have exactly 1 milestone, but got {len(milestones)}.")

    sum_milestone_amounts = Decimal("0")
    previous_deadline_dt: Optional[datetime] = None

    sanitized_milestones = []
    for idx, m in enumerate(milestones):
        if not isinstance(m, dict):
            errors.append(f"Milestone at index {idx} must be a valid object.")
            continue
        
        m_copy = dict(m)

        # Index check (0..n-1)
        m_index = m_copy.get("index")
        if m_index != idx:
            errors.append(f"Milestone index sequence mismatch: expected index {idx}, got {m_index}.")
            m_copy["index"] = idx

        # Title check
        if not m_copy.get("title"):
            errors.append(f"Milestone {idx} must have a non-empty 'title'.")

        # Amount check & sum
        m_amount_str = str(m_copy.get("amount", "")).strip()
        try:
            m_dec = Decimal(m_amount_str)
            if m_dec <= Decimal("0"):
                errors.append(f"Milestone {idx} amount must be positive, got '{m_amount_str}'.")
            sum_milestone_amounts += m_dec
            m_copy["amount"] = str(m_dec)
        except (InvalidOperation, TypeError):
            errors.append(f"Milestone {idx} amount is not a valid decimal string: '{m_amount_str}'.")

        # Required progress bps
        req_bps = m_copy.get("requiredProgressBps")
        if req_bps is None:
            m_copy["requiredProgressBps"] = DEFAULT_VALUES["requiredProgressBps"]
        else:
            try:
                bps_int = int(req_bps)
                if bps_int < 0 or bps_int > 10000:
                    errors.append(f"Milestone {idx} requiredProgressBps must be 0-10000, got {bps_int}.")
                m_copy["requiredProgressBps"] = bps_int
            except (ValueError, TypeError):
                errors.append(f"Milestone {idx} requiredProgressBps must be an integer, got '{req_bps}'.")

        # Acceptance criteria check
        criteria = m_copy.get("acceptanceCriteria")
        if not isinstance(criteria, list) or len(criteria) == 0:
            errors.append(f"Milestone {idx} must contain at least one acceptance criterion.")
        else:
            clean_criteria = [str(c).strip() for c in criteria if str(c).strip()]
            if not clean_criteria:
                errors.append(f"Milestone {idx} has empty acceptance criteria.")
            for c in clean_criteria:
                # Check for vague phrasing
                for vague in VAGUE_CRITERIA_WORDS:
                    if vague in c.lower():
                        assumptions.append(f"Milestone {idx} criterion '{c}' appears subjective. Concrete GitHub deliverables are recommended.")
                        break
            m_copy["acceptanceCriteria"] = clean_criteria

        # Deadline checks: must be valid ISO, strictly increasing, and in the future
        d_str = m_copy.get("deadline", "")
        dt = parse_iso_datetime(d_str)
        if not dt:
            errors.append(f"Milestone {idx} has invalid ISO-8601 deadline '{d_str}'.")
        else:
            if dt <= now:
                errors.append(f"Milestone {idx} deadline '{d_str}' is in the past (reference time: {now.isoformat()}).")
            if previous_deadline_dt and dt <= previous_deadline_dt:
                errors.append(f"Milestone {idx} deadline '{d_str}' must be strictly after milestone {idx-1} deadline '{previous_deadline_dt.isoformat()}'.")
            previous_deadline_dt = dt
            # Format cleanly as ISO-8601 UTC
            m_copy["deadline"] = dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        sanitized_milestones.append(m_copy)

    terms["milestones"] = sanitized_milestones

    # Check sum of milestones == totalAmount
    if total_decimal is not None and sum_milestone_amounts != total_decimal:
        errors.append(
            f"Milestone amounts sum ({sum_milestone_amounts}) does not match totalAmount ({total_decimal})."
        )

    # Creation timestamp
    if not terms.get("createdAt"):
        terms["createdAt"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    return terms, errors, assumptions

def attempt_best_effort_repair(terms_data: Dict[str, Any], reference_time: Optional[datetime] = None) -> Tuple[Dict[str, Any], List[str]]:
    """
    Applies aggressive fallback fixes to produce valid AgreementTerms when LLM retries fail.
    Returns (repaired_terms, repair_warnings).
    """
    repair_warnings: List[str] = []
    repaired = dict(terms_data)
    now = reference_time or datetime.now(timezone.utc)

    # 1. Defaults
    for k, v in DEFAULT_VALUES.items():
        if repaired.get(k) is None:
            repaired[k] = v
            repair_warnings.append(f"Auto-filled default {k}={v}")

    # 2. Lowercase addresses
    for party in ("client", "freelancer"):
        addr = str(repaired.get(party, "0x0000000000000000000000000000000000000000")).lower()
        if not addr.startswith("0x"):
            addr = "0x" + addr
        repaired[party] = addr

    # 3. Ensure title and description
    if not repaired.get("title"):
        repaired["title"] = "Freelance Project Agreement"
    if not repaired.get("description"):
        repaired["description"] = "Deliver project as specified in milestones."

    # 4. GitHub repo
    gh = repaired.get("github")
    if not isinstance(gh, dict):
        gh = {"repoUrl": "https://github.com/client/project", "branch": "main"}
        repair_warnings.append("Added placeholder GitHub repoUrl; update before signing.")
    else:
        if not gh.get("repoUrl"):
            gh["repoUrl"] = "https://github.com/client/project"
            repair_warnings.append("Added placeholder GitHub repoUrl.")
        if not gh.get("branch"):
            gh["branch"] = "main"
    repaired["github"] = gh

    # 5. Milestones
    milestones = repaired.get("milestones", [])
    if not isinstance(milestones, list) or len(milestones) == 0:
        milestones = [{
            "index": 0,
            "title": "Project Completion",
            "description": "Full scope delivery",
            "amount": str(repaired.get("totalAmount", "1.0")),
            "deadline": "2026-12-01T00:00:00Z",
            "requiredProgressBps": 8000,
            "acceptanceCriteria": ["All tests pass and code is reviewed and approved."]
        }]
        repair_warnings.append("Constructed single fallback milestone.")

    payment_mode = repaired.get("paymentMode", "MILESTONE")
    if payment_mode == "LUMP_SUM" and len(milestones) > 1:
        # Collapse into 1 milestone
        combined_amount = sum((Decimal(str(m.get("amount", "0"))) for m in milestones), Decimal("0"))
        all_criteria = []
        for m in milestones:
            all_criteria.extend(m.get("acceptanceCriteria", []))
        milestones = [{
            "index": 0,
            "title": "Complete Delivery",
            "description": "Lump sum final delivery",
            "amount": str(combined_amount or repaired.get("totalAmount", "1.0")),
            "deadline": milestones[-1].get("deadline", "2026-12-01T00:00:00Z"),
            "requiredProgressBps": 8000,
            "acceptanceCriteria": all_criteria or ["All deliverables submitted and verified."]
        }]
        repair_warnings.append("Collapsed multiple milestones into 1 for LUMP_SUM mode.")

    # Fix milestone indexes, amounts, and deadlines
    total_dec = Decimal("0")
    base_timestamp = int(now.timestamp()) + 86400 * 7  # 7 days from now

    for idx, m in enumerate(milestones):
        m["index"] = idx
        if not m.get("title"):
            m["title"] = f"Milestone {idx + 1}"
        
        # Amount
        try:
            amt = Decimal(str(m.get("amount", "1.0")))
            if amt <= Decimal("0"):
                amt = Decimal("1.0")
        except Exception:
            amt = Decimal("1.0")
        m["amount"] = str(amt)
        total_dec += amt

        # Criteria
        crit = m.get("acceptanceCriteria", [])
        if not isinstance(crit, list) or len(crit) == 0:
            crit = ["Deliverable matches specification and passes CI checks."]
        m["acceptanceCriteria"] = [str(c) for c in crit]

        # Deadline
        dt = parse_iso_datetime(str(m.get("deadline", "")))
        if not dt or dt <= now:
            deadline_ts = base_timestamp + (idx * 86400 * 7)
            dt = datetime.fromtimestamp(deadline_ts, timezone.utc)
            m["deadline"] = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            repair_warnings.append(f"Auto-adjusted milestone {idx} deadline to future date {m['deadline']}.")
        else:
            m["deadline"] = dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    repaired["milestones"] = milestones
    repaired["totalAmount"] = str(total_dec)
    repaired["createdAt"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    return repaired, repair_warnings
