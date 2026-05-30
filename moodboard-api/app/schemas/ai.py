from typing import Any, Literal, Optional
from pydantic import BaseModel


class AIGenerateRequest(BaseModel):
    type: Literal["caption", "tags", "description", "collection_name", "collection_desc"]
    context: dict[str, Any] = {}


class AIGenerateResponse(BaseModel):
    type: str
    content: str


class ImageAnalyzeRequest(BaseModel):
    image_url: str


class ImageAnalyzeResponse(BaseModel):
    title: Optional[str] = None
    tags: list[str] = []
    description: Optional[str] = None
