from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List
from app.services.dataset_service import dataset_service

router = APIRouter(prefix="/machines", tags=["Machines & Digital Twin"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_machines():
    """List all 17 Caterpillar machines in the fleet with health and utilization stats."""
    return dataset_service.get_all_machines()


@router.get("/{machine_id}", response_model=Dict[str, Any])
async def get_machine(machine_id: str):
    """Retrieve full Machine Digital Twin profile for a specific machine ID."""
    machine = dataset_service.get_machine_digital_twin(machine_id.upper())
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in fleet.")
    return machine
