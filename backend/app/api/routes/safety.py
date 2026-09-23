from fastapi import APIRouter, Query
from typing import Any, Dict, Optional
from app.services.dataset_service import dataset_service
from app.services.copilot_service import CAT_SIM_PROTOCOLS

router = APIRouter(prefix="/safety", tags=["Safety Center"])


@router.get("", response_model=Dict[str, Any])
async def get_safety_overview(machine_id: Optional[str] = Query(None, description="Optional machine ID filter")):
    """Get real-time Safety Center metrics, Risk Score, Proximity Radar, and Incident Timeline."""
    return dataset_service.get_safety_summary(machine_id)


@router.get("/protocols", response_model=Dict[str, Any])
async def get_safety_protocols():
    """Retrieve Cat Training Simulation safety protocols and standard operating procedures."""
    return {
        "protocols": [
            {
                "id": "PROT-ROPS-01",
                "title": "3-Point Contact & Seatbelt Interlock",
                "category": "In-Cab Restraints",
                "summary": CAT_SIM_PROTOCOLS["seatbelt"],
                "checklist": [
                    "Maintain 3 points of contact when mounting/dismounting cab ladder.",
                    "Fasten high-visibility orange 3-point seatbelt firmly across pelvic region.",
                    "Verify in-cab display green interlock confirmation before unlocking hydraulic pilot.",
                ],
            },
            {
                "id": "PROT-PROX-02",
                "title": "5-Meter Dynamic Proximity Zone",
                "category": "Exclusion Zone",
                "summary": CAT_SIM_PROTOCOLS["proximity"],
                "checklist": [
                    "Maintain 5-meter radial clearance around maximum counterweight and implement reach.",
                    "Sound two horn blasts before slewing or reversing machine.",
                    "Halt implement motion immediately if Cat Detect radar sounds continuous hazard beep.",
                ],
            },
            {
                "id": "PROT-DSS-03",
                "title": "Operator Fatigue Management (Cat DSS)",
                "category": "Ergonomics & Alertness",
                "summary": CAT_SIM_PROTOCOLS["fatigue"],
                "checklist": [
                    "Heed in-cab optical seat vibration alarm upon fatigue trigger.",
                    "Ground machine bucket/blade, engage neutral lock, idle 2 mins for turbo cooldown.",
                    "Report to site safety supervisor for mandatory 15-minute hydration & rest rotation.",
                ],
            },
            {
                "id": "PROT-HYD-04",
                "title": "Hydraulic Overpressure & Thermal Relief",
                "category": "Machine Protection",
                "summary": CAT_SIM_PROTOCOLS["hydraulic_pressure"],
                "checklist": [
                    "Avoid continuous full-stroke hydraulic cylinder stall against hard rock.",
                    "Monitor in-cab hydraulic pressure dial — keep below 2,800 psi maximum continuous.",
                    "If hydraulic temp exceeds 95°C, cycle implements in air to circulate oil through cooler.",
                ],
            },
        ]
    }
