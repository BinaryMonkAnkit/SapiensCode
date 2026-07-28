"""
Validation schemas for code execution payloads.
"""

from typing import Optional
from pydantic import BaseModel, Field, field_validator
from .languages import get_language_config, supported_languages_summary


class CodeExecutionRequest(BaseModel):
    language: str = Field(..., description="Programming language key (e.g. 'py', 'python', 'cpp')")
    code: str = Field(..., max_length=50_000, description="Source code text (max 50KB)")
    stdin: Optional[str] = Field(default="", max_length=10_000, description="Optional standard input data")
    timeout: int = Field(default=10, ge=1, le=15, description="Timeout limit (1 to 15 seconds)")

    @field_validator("language")
    def validate_language(cls, value: str) -> str:
        config = get_language_config(value)
        if not config:
            raise ValueError(
                f"Unsupported language '{value}'. Supported options: {supported_languages_summary()}"
            )
        return value.strip().lower()

    @field_validator("code")
    def validate_code_not_empty(cls, value: str) -> str:
        # Strip null bytes / unsafe null character payloads that disrupt C/GCC compilers
        cleaned_code = value.replace("\x00", "")
        if not cleaned_code.strip():
            raise ValueError("Execution payload code cannot be empty.")
        return cleaned_code