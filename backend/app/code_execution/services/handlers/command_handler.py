"""
In-memory virtual command handler for non-sandbox shell interactions (built-in terminal UI utility commands).
"""

import re
import shlex
from datetime import datetime, timezone
from typing import Dict, Any, Callable, List

# Maximum allowed character count for a single terminal utility command
MAX_CMD_LENGTH = 500

# Control character filter regex (strips non-printable ascii except space)
CONTROL_CHAR_REGEX = re.compile(r"[\x00-\x08\x0b-\x1f\x7f-\x9f]")


def _cmd_help(args: List[str]) -> Dict[str, Any]:
    return {
        "output": "Available commands:\n"
                  "  help         - Show this help message\n"
                  "  time         - Output current UTC server time\n"
                  "  echo <text>  - Echo arguments back to console\n"
                  "  clear        - Clear terminal screen buffer",
        "action": None,
    }


def _cmd_time(args: List[str]) -> Dict[str, Any]:
    utc_now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return {"output": utc_now, "action": None}


def _cmd_echo(args: List[str]) -> Dict[str, Any]:
    # Joins arguments back with standard single space
    return {"output": " ".join(args), "action": None}


def _cmd_clear(args: List[str]) -> Dict[str, Any]:
    # Return "__CLEAR__" so the frontend recognizes the clear sentinel
    return {"output": "__CLEAR__", "action": "CLEAR_SCREEN"}


# Command Dispatch Registry
COMMAND_REGISTRY: Dict[str, Callable[[List[str]], Dict[str, Any]]] = {
    "help": _cmd_help,
    "time": _cmd_time,
    "echo": _cmd_echo,
    "clear": _cmd_clear,
}


def handle_command(line: str) -> Dict[str, Any]:
    """
    Parses and processes an interactive shell control command safely.

    Returns a dict containing:
      - output: String data to render
      - action: Special action flags for the WebSocket controller (e.g., CLEAR_SCREEN)
      - error: Error message if command fails validation
    """
    if not line or not line.strip():
        return {"output": "", "action": None}

    # 1. Enforce payload safety limits
    if len(line) > MAX_CMD_LENGTH:
        return {
            "output": f"Command error: Exceeded maximum command length of {MAX_CMD_LENGTH} characters.",
            "action": None,
            "error": "LENGTH_LIMIT_EXCEEDED",
        }

    # 2. Strip non-printable / control characters
    sanitized_line = CONTROL_CHAR_REGEX.sub("", line).strip()

    # 3. Tokenize command safely
    try:
        tokens = shlex.split(sanitized_line)
    except ValueError:
        # Fallback split if unclosed quote provided
        tokens = sanitized_line.split()

    if not tokens:
        return {"output": "", "action": None}

    cmd_name = tokens[0].lower()
    args = tokens[1:]

    # 4. Dispatch command
    handler = COMMAND_REGISTRY.get(cmd_name)
    if handler:
        return handler(args)

    return {
        "output": f"command not found: {cmd_name}",
        "action": None,
        "error": "UNKNOWN_COMMAND",
    }