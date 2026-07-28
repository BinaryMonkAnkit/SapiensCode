"""
Per-language configuration for the Docker-based code runner.

Defines execution attributes, compilation steps, binary names, and default
resource caps per supported language runtime.
"""

from typing import Dict, List, Optional, Set
from pydantic import BaseModel, Field

UNBUFFERED: List[str] = ["stdbuf", "-o0", "-e0"]


class LanguageConfig(BaseModel):
    canonical_name: str
    filename: str
    build_cmd: Optional[List[str]] = None
    run_cmd: List[str]
    max_memory_mb: int = Field(default=128, description="Memory limit in MB")
    default_timeout: int = Field(default=10, description="Timeout limit in seconds")


# Map of canonical language configurations
LANGUAGE_CONFIGS: Dict[str, LanguageConfig] = {
    "python": LanguageConfig(
        canonical_name="python",
        filename="main.py",
        build_cmd=None,
        run_cmd=["python3", "-u", "main.py"],
        max_memory_mb=128,
    ),
    "javascript": LanguageConfig(
        canonical_name="javascript",
        filename="main.js",
        build_cmd=None,
        run_cmd=UNBUFFERED + ["node", "main.js"],
        max_memory_mb=128,
    ),
    "java": LanguageConfig(
        canonical_name="java",
        filename="Main.java",
        build_cmd=["javac", "Main.java"],
        run_cmd=UNBUFFERED + ["java", "-Xmx128m", "Main"],
        max_memory_mb=256,  # JVM requires higher baseline memory
    ),
    "c": LanguageConfig(
        canonical_name="c",
        filename="main.c",
        build_cmd=["gcc", "main.c", "-O2", "-o", "main.out"],
        run_cmd=UNBUFFERED + ["./main.out"],
        max_memory_mb=64,
    ),
    "cpp": LanguageConfig(
        canonical_name="cpp",
        filename="main.cpp",
        build_cmd=["g++", "main.cpp", "-O2", "-o", "main.out"],
        run_cmd=UNBUFFERED + ["./main.out"],
        max_memory_mb=64,
    ),
}

# Alias resolution map
LANGUAGE_ALIASES: Dict[str, str] = {
    "py": "python",
    "python": "python",
    "js": "javascript",
    "javascript": "javascript",
    "java": "java",
    "c": "c",
    "cpp": "cpp",
    "c++": "cpp",
}


def get_language_config(language_input: str) -> Optional[LanguageConfig]:
    """
    Resolves language alias and returns the safety config model.
    Returns None if the language is unsupported.
    """
    normalized = language_input.strip().lower()
    canonical = LANGUAGE_ALIASES.get(normalized)
    if not canonical:
        return None
    return LANGUAGE_CONFIGS.get(canonical)


def get_supported_languages() -> Set[str]:
    """Returns unique list of supported language keys."""
    return set(LANGUAGE_ALIASES.keys())


def supported_languages_summary() -> str:
    """Returns comma-separated string of all accepted language identifiers."""
    return ", ".join(sorted(get_supported_languages()))