from __future__ import annotations
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional

from .models import ParseResult

# Resolve the JAR path relative to the project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_JAR = _PROJECT_ROOT / "src" / "target" / "grammar-oracle-parser.jar"


def _find_java() -> str:
    """Find the Java executable, checking common Homebrew paths."""
    # Check if java is on PATH
    java_path = shutil.which("java")
    if java_path:
        # Verify it actually works (macOS stub may exist but fail)
        try:
            result = subprocess.run(
                [java_path, "-version"], capture_output=True, timeout=3
            )
            if result.returncode == 0:
                return java_path
        except (subprocess.SubprocessError, OSError):
            pass

    # Check JAVA_HOME
    java_home = os.environ.get("JAVA_HOME")
    if java_home:
        candidate = os.path.join(java_home, "bin", "java")
        if os.path.isfile(candidate):
            return candidate

    # Check common Homebrew locations on macOS
    brew_paths = [
        "/opt/homebrew/opt/openjdk/bin/java",
        "/opt/homebrew/bin/java",
        "/usr/local/opt/openjdk/bin/java",
    ]
    for path in brew_paths:
        if os.path.isfile(path):
            return path

    # Try to find via /usr/libexec/java_home on macOS
    try:
        result = subprocess.run(
            ["/usr/libexec/java_home"], capture_output=True, text=True, timeout=3
        )
        if result.returncode == 0:
            candidate = os.path.join(result.stdout.strip(), "bin", "java")
            if os.path.isfile(candidate):
                return candidate
    except (subprocess.SubprocessError, OSError):
        pass

    return "java"


def parse_sentence(sentence: str, language: str = "spanish",
                   jar_path: Optional[str] = None) -> ParseResult:
    """Call the Java parser JAR and return a ParseResult."""
    jar = Path(jar_path) if jar_path else _DEFAULT_JAR

    if not jar.exists():
        return ParseResult(
            valid=False,
            sentence=sentence,
            error=f"Parser JAR not found at {jar}. Run 'mvn clean package' in src/.",
        )

    java_bin = _find_java()
    cmd = [
        java_bin, "-jar", str(jar),
        "--json",
        "--language", language.upper(),
        "--sentence", sentence,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=5,
        )

        stdout = result.stdout.strip()
        if not stdout:
            return ParseResult(
                valid=False,
                sentence=sentence,
                error=f"Parser returned no output. stderr: {result.stderr[:500]}",
            )

        data = json.loads(stdout)
        return ParseResult(**data)

    except subprocess.TimeoutExpired:
        return ParseResult(
            valid=False,
            sentence=sentence,
            error="Parser timed out after 5 seconds",
        )
    except json.JSONDecodeError as e:
        return ParseResult(
            valid=False,
            sentence=sentence,
            error=f"Invalid JSON from parser: {e}",
        )
    except FileNotFoundError:
        return ParseResult(
            valid=False,
            sentence=sentence,
            error=f"Java not found at '{java_bin}'. Ensure Java 21+ is installed.",
        )
