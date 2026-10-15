"""Supabase Storage adapter for ClariFi.

Uploaded documents are kept in a private Supabase Storage bucket. The backend
uses the server-only Supabase secret/service key, so the browser never gets
storage credentials. The database stores only document metadata and the
object key.
"""
from __future__ import annotations

import logging
from pathlib import PurePosixPath
from urllib.parse import quote

import httpx

from app.config import get_settings

logger = logging.getLogger("clarifi.storage")


class StorageError(RuntimeError):
    """Safe storage-layer error suitable for returning from API routes."""


def _settings():
    return get_settings()


def is_configured() -> bool:
    settings = _settings()
    url = settings.supabase_url or ""
    key = settings.supabase_service_role_key or ""
    if "<PROJECT-REF>" in url or "your_server_secret_key" in key:
        return False
    return bool(
        settings.supabase_url
        and settings.supabase_service_role_key
        and settings.supabase_storage_bucket
    )


def _require_configured():
    if not is_configured():
        raise StorageError(
            "Supabase Storage is not configured on this server (missing "
            "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_STORAGE_BUCKET)."
        )
    return _settings()


def _object_url(object_key: str) -> str:
    settings = _require_configured()
    bucket = quote(settings.supabase_storage_bucket, safe="")
    key = quote(object_key, safe="/")
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{key}"


def _headers(*, content_type: str | None = None, upsert: bool = False) -> dict[str, str]:
    settings = _require_configured()
    key = settings.supabase_service_role_key
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
    }
    if content_type:
        headers["Content-Type"] = content_type
    if upsert:
        headers["x-upsert"] = "true"
    return headers


def _raise_response_error(response: httpx.Response, operation: str) -> None:
    if response.is_success:
        return
    # Supabase normally returns JSON with a message/statusCode, but keep the
    # fallback useful if a proxy returns plain text.
    try:
        payload = response.json()
        detail = payload.get("message") or payload.get("error") or payload
    except ValueError:
        detail = response.text[:300]
    logger.warning("Supabase Storage %s failed (%s): %s", operation, response.status_code, detail)
    raise StorageError(f"Could not {operation} the file in Supabase Storage.")


def build_object_key(document_id: str, filename: str) -> str:
    safe_name = PurePosixPath(filename).name.replace("/", "_").replace("\\", "_").strip()
    safe_name = safe_name or "document"
    return f"documents/{document_id}/{safe_name}"


def upload_bytes(object_key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    try:
        response = httpx.post(
            _object_url(object_key),
            content=data,
            headers=_headers(content_type=content_type, upsert=True),
            timeout=60.0,
        )
        _raise_response_error(response, "upload")
    except StorageError:
        raise
    except httpx.HTTPError as exc:
        logger.warning("Supabase Storage upload failed for %s: %s", object_key, exc)
        raise StorageError("Could not upload the file to Supabase Storage. Please try again.") from exc


def download_bytes(object_key: str) -> bytes:
    try:
        response = httpx.get(_object_url(object_key), headers=_headers(), timeout=60.0)
        _raise_response_error(response, "download")
        return response.content
    except StorageError:
        raise
    except httpx.HTTPError as exc:
        logger.warning("Supabase Storage download failed for %s: %s", object_key, exc)
        raise StorageError("Could not read the file from Supabase Storage.") from exc


def delete_object(object_key: str) -> None:
    try:
        response = httpx.delete(_object_url(object_key), headers=_headers(), timeout=60.0)
        _raise_response_error(response, "delete")
    except StorageError:
        raise
    except httpx.HTTPError as exc:
        logger.warning("Supabase Storage delete failed for %s: %s", object_key, exc)
        raise StorageError("Could not delete the file from Supabase Storage.") from exc


def object_exists(object_key: str) -> bool:
    try:
        response = httpx.get(_object_url(object_key), headers=_headers(), timeout=30.0)
        if response.status_code == 404:
            return False
        _raise_response_error(response, "check")
        return True
    except StorageError:
        raise
    except httpx.HTTPError as exc:
        logger.warning("Supabase Storage existence check failed for %s: %s", object_key, exc)
        raise StorageError("Could not check Supabase Storage.") from exc


def public_url(object_key: str) -> str | None:
    """Return a public URL only when the configured bucket is intentionally public.

    ClariFi does not require public document URLs; uploaded documents are kept
    private and accessed server-side. This helper is retained for compatibility.
    """
    settings = _settings()
    if not settings.supabase_url or not settings.supabase_storage_bucket:
        return None
    bucket = quote(settings.supabase_storage_bucket, safe="")
    key = quote(object_key, safe="/")
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{key}"
