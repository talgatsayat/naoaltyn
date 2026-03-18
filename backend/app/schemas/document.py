from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class DocumentResponse(BaseModel):
    id: UUID
    document_type: str
    original_filename: str
    file_size: int
    uploaded_at: datetime
    model_config = {"from_attributes": True}
