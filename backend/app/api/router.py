from fastapi import APIRouter
from app.api.routes import health, machines, safety, analytics, simulation, copilot

api_router = APIRouter()

# Health route
api_router.include_router(health.router)

# Core Focused Modules: 2, 6, 7, 8 & Cat Simulation Models
api_router.include_router(safety.router)
api_router.include_router(machines.router)
api_router.include_router(analytics.router)
api_router.include_router(simulation.router)
api_router.include_router(copilot.router)
