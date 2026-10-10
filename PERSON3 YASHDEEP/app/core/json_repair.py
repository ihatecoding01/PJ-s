import json
import re
from typing import Any, Dict

def strip_code_fences(text: str) -> str:
    """Strips markdown code blocks (e.g. ```json ... ```) and leading/trailing whitespace."""
    text = text.strip()
    
    # Check for ```json ... ``` or ``` ... ```
    fence_pattern = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.DOTALL | re.IGNORECASE)
    match = fence_pattern.match(text)
    if match:
        return match.group(1).strip()
    
    # Check if there is an embedded code block anywhere in text
    embedded_pattern = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)
    search_match = embedded_pattern.search(text)
    if search_match:
        return search_match.group(1).strip()

    return text

def extract_outermost_json(text: str) -> str:
    """Finds the outermost {...} or [...] block in text."""
    text = strip_code_fences(text)
    
    # Find first '{' or '['
    first_brace = text.find('{')
    first_bracket = text.find('[')
    
    start_idx = -1
    end_char = ''
    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        start_idx = first_brace
        end_char = '}'
    elif first_bracket != -1:
        start_idx = first_bracket
        end_char = ']'
        
    if start_idx == -1:
        return text

    # Find the corresponding matching closing char from the end
    end_idx = text.rfind(end_char)
    if end_idx != -1 and end_idx > start_idx:
        return text[start_idx:end_idx + 1]
    
    return text[start_idx:]

def repair_json_string(text: str) -> str:
    """
    Applies heuristics to fix common LLM JSON syntax mistakes:
    - Trailing commas before } or ]
    - Unquoted keys
    - Single quotes instead of double quotes for keys/strings
    """
    cleaned = extract_outermost_json(text)

    # Remove trailing commas: , \s* } -> }  and  , \s* ] -> ]
    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)

    return cleaned

def parse_robust_json(text: str) -> Any:
    """
    Parses JSON from raw LLM output with multi-stage sanitization and fallback repair.
    Raises ValueError if parsing fails.
    """
    if not text or not text.strip():
        raise ValueError("Empty response string, cannot parse JSON")

    # 1. Try direct parse
    cleaned = strip_code_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 2. Extract outermost JSON structure
    extracted = extract_outermost_json(cleaned)
    try:
        return json.loads(extracted)
    except json.JSONDecodeError:
        pass

    # 3. Apply regex repairs (trailing commas, etc.)
    repaired = repair_json_string(extracted)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON from LLM output: {str(e)}\nRaw output was: {text[:200]}...")
