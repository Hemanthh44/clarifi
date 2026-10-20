"""Supabase Storage adapter for ClariFi.

Uploaded documents are kept in a private Supabase Storage bucket. The backend
uses the server-only Supabase secret/service key, so the browser never gets
storage credentials. The database stores only document metadata and the
object key.
"""
from __future__ import annotations

import logging
from pathlib import Path, PurePosixPath
from urllib.parse import quote

import httpx

from app.config import get_settings

logger = logging.getLogger("clarifi.storage")

# Local filesystem storage directory used when Supabase Storage credentials are not set (e.g. local development)
LOCAL_STORAGE_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads"


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
    raise StorageError(f"Could not {operation} the file in Supabase Storage: {detail} (HTTP {response.status_code}).")


def build_object_key(document_id: str, filename: str) -> str:
    safe_name = PurePosixPath(filename).name.replace("/", "_").replace("\\", "_").strip()
    safe_name = safe_name or "document"
    return f"documents/{document_id}/{safe_name}"


def upload_bytes(object_key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    if not is_configured():
        try:
            target_path = LOCAL_STORAGE_DIR / object_key
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(data)
            logger.info("Supabase Storage not configured; saved file locally to %s", target_path)
            return
        except Exception as exc:
            logger.warning("Local storage upload failed for %s: %s", object_key, exc)
            raise StorageError(f"Could not save file to local storage: {exc}") from exc

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
        err_msg = str(exc).strip()
        exc_type = type(exc).__name__
        reason = f": {exc_type} ({err_msg})" if err_msg else f": {exc_type}"
        raise StorageError(
            f"Could not upload the file to Supabase Storage{reason}. "
            "Please verify SUPABASE_URL, network connectivity, and that the Supabase project is active."
        ) from exc


def download_bytes(object_key: str) -> bytes:
    if not is_configured():
        target_path = LOCAL_STORAGE_DIR / object_key
        if not target_path.exists():
            raise StorageError(f"File not found in local storage: {object_key}")
        return target_path.read_bytes()

    try:
        response = httpx.get(_object_url(object_key), headers=_headers(), timeout=60.0)
        _raise_response_error(response, "download")
        return response.content
    except StorageError:
        raise
    except httpx.HTTPError as exc:
        logger.warning("Supabase Storage download failed for %s: %s", object_key, exc)
        err_msg = str(exc).strip()
        exc_type = type(exc).__name__
        reason = f": {exc_type} ({err_msg})" if err_msg else f": {exc_type}"
        raise StorageError(f"Could not read the file from Supabase Storage{reason}.") from exc


def delete_object(object_key: str) -> None:
    if not is_configured():
        target_path = LOCAL_STORAGE_DIR / object_key
        if target_path.exists():
            try:
                target_path.unlink()
            except Exception as exc:
                logger.warning("Could not delete local file %s: %s", target_path, exc)
        return

    try:
        response = httpx.delete(_object_url(object_key), headers=_headers(), timeout=60.0)
        _raise_response_error(response, "delete")
    except StorageError:
        raise
    except httpx.HTTPError as exc:
        logger.warning("Supabase Storage delete failed for %s: %s", object_key, exc)
        err_msg = str(exc).strip()
        exc_type = type(exc).__name__
        reason = f": {exc_type} ({err_msg})" if err_msg else f": {exc_type}"
        raise StorageError(f"Could not delete the file from Supabase Storage{reason}.") from exc


def object_exists(object_key: str) -> bool:
    if not is_configured():
        return (LOCAL_STORAGE_DIR / object_key).exists()

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
        err_msg = str(exc).strip()
        exc_type = type(exc).__name__
        reason = f": {exc_type} ({err_msg})" if err_msg else f": {exc_type}"
        raise StorageError(f"Could not check Supabase Storage{reason}.") from exc


def public_url(object_key: str) -> str | None:
    """Return a public URL only when the configured bucket is intentionally public.

    ClariFi does not require public document URLs; uploaded documents are kept
    private and accessed server-side. This helper is retained for compatibility.
    """
    if not is_configured():
        return None
    settings = _settings()
    if not settings.supabase_url or not settings.supabase_storage_bucket:
        return None
    bucket = quote(settings.supabase_storage_bucket, safe="")
    key = quote(object_key, safe="/")
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{key}"
