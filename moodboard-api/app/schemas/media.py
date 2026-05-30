import uuid
from typing import Optional, Any
from pydantic import BaseModel


class FetchURLRequest(BaseModel):
    url: str


class FetchURLResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    embed_url: Optional[str] = None
    source_platform: Optional[str] = None
    media_type: Optional[str] = None
    og_data: dict[str, Any] = {}


class UploadInitRequest(BaseModel):
    filename: str
    content_type: str
    file_size: Optional[int] = None


class UploadInitResponse(BaseModel):
    upload_url: str
    file_key: str
    expires_in: int = 300


class UploadConfirmRequest(BaseModel):
    file_key: str
    title: Optional[str] = None
    description: Optional[str] = None
    tags: list[str] = []
    is_public: bool = True
    collection_id: Optional[uuid.UUID] = None


class MetadataJobPayload(BaseModel):
    post_id: uuid.UUID


class DownloadVideoPayload(BaseModel):
    post_id: uuid.UUID
    source_url: str


class DownloadURLRequest(BaseModel):
    source_url: str


class DownloadURLResponse(BaseModel):
    url: str
    filename: str
    ext: str
