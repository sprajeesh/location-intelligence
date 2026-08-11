import tomllib
from functools import lru_cache
from pathlib import Path

# apps/api/pyproject.toml is the single source of truth for the API's version
# (bumped by release-please) -- read it at startup instead of hardcoding the
# version string in multiple places that would drift out of sync.
_PYPROJECT_PATH = Path(__file__).resolve().parent.parent.parent / "pyproject.toml"


@lru_cache
def get_version() -> str:
    with _PYPROJECT_PATH.open("rb") as f:
        return tomllib.load(f)["project"]["version"]
