"""File names shared by the build (extract) and load steps.

Kept separate from extract.py so the runtime image can load a snapshot without
pyosmium, which is a dev-only dependency.
"""

ROWS_FILENAME = "poi-snapshot.ndjson.gz"
MANIFEST_FILENAME = "poi-snapshot.manifest.json"
