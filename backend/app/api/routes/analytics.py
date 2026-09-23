from fastapi import APIRouter
from typing import Any, Dict
from app.services.dataset_service import dataset_service

router = APIRouter(prefix="/analytics", tags=["Fleet Analytics & Sustainability"])


@router.get("/fleet", response_model=Dict[str, Any])
async def get_fleet_analytics():
    """Retrieve cross-machine, cross-site, shift analytics, and Caterpillar 2030 sustainability metrics."""
    return dataset_service.get_fleet_analytics()
