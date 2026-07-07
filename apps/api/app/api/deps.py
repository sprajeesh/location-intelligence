from fastapi import Depends, Header, HTTPException

from app.config.settings import Settings, get_settings


async def verify_api_key(
    x_internal_api_key: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    """Guards routes behind a shared secret only the Next.js BFF should know.

    The API sits on a port reachable from the whole internet (the Cloudflare
    Worker caller has no fixed egress IP to allowlist at the network layer --
    see infra/oci/network.tf), so this is the app-layer backstop. Enforcement
    is opt-in: if api_shared_secret isn't configured (e.g. local dev), every
    request passes through unchanged.

    settings is injected via Depends (not a plain get_settings() call) so
    tests can override it with application.dependency_overrides[get_settings]
    -- get_settings() itself is @lru_cache'd, so a direct call here would
    ignore per-test overrides and always return whichever instance was
    cached first.
    """
    if settings.api_shared_secret and x_internal_api_key != settings.api_shared_secret:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
