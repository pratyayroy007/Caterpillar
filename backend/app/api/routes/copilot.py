from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Dict, Optional
from app.services.copilot_service import copilot_service

router = APIRouter(prefix="/copilot", tags=["AI Operator Copilot"])


class CopilotChatRequest(BaseModel):
    query: str
    machine_id: Optional[str] = None


@router.post("/chat", response_model=Dict[str, Any])
async def chat_copilot(req: CopilotChatRequest):
    """Conversational grounded Cat AI Copilot answering queries using live telemetry and Cat safety protocols."""
    return copilot_service.answer_query(query=req.query, machine_id=req.machine_id)
