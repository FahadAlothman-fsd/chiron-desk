"""
Routers package for AI service.

Contains all FastAPI routers for the service endpoints.
"""

from . import health, models

__all__ = ["health", "models"]