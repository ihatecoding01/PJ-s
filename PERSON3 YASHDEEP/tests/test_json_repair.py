import pytest
from app.core.json_repair import strip_code_fences, extract_outermost_json, parse_robust_json

def test_strip_markdown_code_fences():
    raw_1 = "```json\n{\"key\": \"value\"}\n```"
    assert strip_code_fences(raw_1) == '{"key": "value"}'

    raw_2 = "```\n{\"key\": \"value\"}\n```"
    assert strip_code_fences(raw_2) == '{"key": "value"}'

def test_extract_outermost_json_surrounded_by_text():
    raw = (
        "Here is the requested draft terms object:\n\n"
        "```json\n"
        "{\n  \"title\": \"Test Project\",\n  \"totalAmount\": \"1.0\"\n}\n"
        "```\n\n"
        "Please let me know if you need changes!"
    )
    parsed = parse_robust_json(raw)
    assert parsed["title"] == "Test Project"
    assert parsed["totalAmount"] == "1.0"

def test_repair_trailing_commas():
    malformed = """
    {
      "items": [
        "one",
        "two",
      ],
      "active": true,
    }
    """
    parsed = parse_robust_json(malformed)
    assert len(parsed["items"]) == 2
    assert parsed["active"] is True

def test_parse_empty_string_raises():
    with pytest.raises(ValueError):
        parse_robust_json("")
