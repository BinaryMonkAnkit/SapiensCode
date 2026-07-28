from datetime import datetime

def handle_command(line: str) -> str:
    """A tiny fake command set for the plain terminal (non-run) mode."""
    cmd = line.strip()
    lower = cmd.lower()

    if lower == "":
        return ""
    if lower == "help":
        return "available commands: help, time, echo <text>, clear"
    if lower == "time":
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if lower.startswith("echo "):
        return cmd[5:]
    if lower == "clear":
        return "__CLEAR__"
    return f"command not found: {cmd}"