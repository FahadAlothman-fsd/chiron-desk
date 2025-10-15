"""
Health check router for AI service.

Provides endpoints for health and readiness checks using the provider abstraction layer.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.services.provider_factory import ProviderFactory
from app.services.exceptions import (
    ChironBaseError,
    AIProviderError,
    ProviderAuthenticationError,
    RateLimitExceededError
)
from app.utils.logging import get_logger, LoggingContext

router = APIRouter(prefix="/health", tags=["health"])
logger = get_logger(__name__)


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint.
    
    Returns the health status of the service and its AI provider connection.
    Uses the provider factory to get the configured provider and validate connection.
    
    Returns:
        Dict containing health status information
        
    Raises:
        HTTPException: If health check fails
    """
    with LoggingContext(operation="health_check"):
        try:
            logger.info("Performing health check")
            
            # Get provider from factory
            provider = ProviderFactory.get_provider()
            
            # Validate provider connection
            is_healthy = await provider.validate_connection()
            
            if is_healthy:
                logger.info("Health check passed", extra={
                    "provider": provider.__class__.__name__
                })
                
                return {
                    "status": "healthy",
                    "provider": provider.__class__.__name__,
                    "timestamp": "2025-10-09T20:00:00Z"  # Would use actual timestamp in production
                }
            else:
                logger.warning("Health check failed - provider connection failed")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={
                        "status": "unhealthy",
                        "reason": "Provider connection failed",
                        "provider": provider.__class__.__name__
                    }
                )
                
        except HTTPException:
            # Re-raise HTTP exceptions (like the one above)
            raise
            
        except ProviderAuthenticationError as e:
            logger.error("Health check failed - authentication error", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "unhealthy",
                    "reason": "Provider authentication failed",
                    "provider": "unknown"
                }
            )
            
        except RateLimitExceededError as e:
            logger.error("Health check failed - rate limit exceeded", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "unhealthy",
                    "reason": "Provider rate limit exceeded",
                    "provider": "unknown"
                }
            )
            
        except AIProviderError as e:
            logger.error("Health check failed - provider error", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "unhealthy",
                    "reason": "Provider error occurred",
                    "provider": "unknown"
                }
            )
            
        except ChironBaseError as e:
            logger.error("Health check failed - chiron error", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "unhealthy",
                    "reason": "Service error occurred"
                }
            )
            
        except Exception as e:
            logger.error("Health check failed - unexpected error", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "unhealthy",
                    "reason": "Unexpected error occurred"
                }
            )


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check endpoint.
    
    Returns whether the service is ready to handle requests.
    This is a simple check that the service is running and configured.
    
    Returns:
        Dict containing readiness status information
    """
    with LoggingContext(operation="readiness_check"):
        try:
            logger.info("Performing readiness check")
            
            # Check if provider is configured
            provider = ProviderFactory.get_provider()
            
            if provider:
                logger.info("Readiness check passed", extra={
                    "provider": provider.__class__.__name__
                })
                
                return {
                    "status": "ready",
                    "provider": provider.__class__.__name__,
                    "timestamp": "2025-10-09T20:00:00Z"  # Would use actual timestamp in production
                }
            else:
                logger.warning("Readiness check failed - no provider configured")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={
                        "status": "not_ready",
                        "reason": "No provider configured"
                    }
                )
                
        except HTTPException:
            # Re-raise HTTP exceptions (like the one above)
            raise
            
        except Exception as e:
            logger.error("Readiness check failed - unexpected error", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "not_ready",
                    "reason": "Unexpected error occurred"
                }
            )