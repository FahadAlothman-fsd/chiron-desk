"""
Models router for AI service.

Provides endpoints for listing available AI models through the provider abstraction layer.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field
from app.services.provider_factory import ProviderFactory
from app.services.exceptions import (
    ChironBaseError,
    AIProviderError,
    ProviderAuthenticationError,
    RateLimitExceededError
)
from app.utils.logging import get_logger, LoggingContext

router = APIRouter(prefix="/models", tags=["models"])
logger = get_logger(__name__)


class ModelInfo(BaseModel):
    """Model information response."""
    id: str = Field(..., description="Unique model identifier")
    name: Optional[str] = Field(None, description="Human-readable model name")
    description: Optional[str] = Field(None, description="Model description")
    pricing: Optional[Dict[str, Any]] = Field(None, description="Pricing information")
    context_length: Optional[int] = Field(None, description="Maximum context length")


class ModelsResponse(BaseModel):
    """Models list response."""
    data: List[ModelInfo] = Field(..., description="List of available models")
    count: int = Field(..., description="Total number of models")
    provider: str = Field(..., description="Provider name")


@router.get("/", response_model=ModelsResponse, status_code=status.HTTP_200_OK)
async def list_models(
    provider_filter: Optional[str] = Query(None, description="Filter by provider (if supported)"),
    limit: Optional[int] = Query(100, ge=1, le=1000, description="Maximum number of models to return"),
    offset: Optional[int] = Query(0, ge=0, description="Number of models to skip")
) -> ModelsResponse:
    """
    List available AI models.
    
    Retrieves the list of available models from the configured AI provider
    through the provider abstraction layer.
    
    Args:
        provider_filter: Optional filter for specific providers
        limit: Maximum number of models to return (1-1000)
        offset: Number of models to skip for pagination
        
    Returns:
        ModelsResponse containing list of available models
        
    Raises:
        HTTPException: If model retrieval fails
    """
    with LoggingContext(operation="list_models", limit=limit, offset=offset):
        try:
            logger.info("Retrieving models list", extra={
                "provider_filter": provider_filter,
                "limit": limit,
                "offset": offset
            })
            
            # Get provider from factory
            provider = ProviderFactory.get_provider()
            
            # Get models from provider
            models_data = await provider.list_models()
            
            # Apply pagination
            total_count = len(models_data)
            actual_offset = offset or 0
            actual_limit = limit or 100
            paginated_models = models_data[actual_offset:actual_offset + actual_limit]
            
            # Convert to ModelInfo objects
            model_infos = []
            for model in paginated_models:
                model_info = ModelInfo(
                    id=model.get("id", ""),
                    name=model.get("name"),
                    description=model.get("description"),
                    pricing=model.get("pricing"),
                    context_length=model.get("context_length")
                )
                model_infos.append(model_info)
            
            logger.info("Models retrieved successfully", extra={
                "provider": provider.__class__.__name__,
                "total_count": total_count,
                "returned_count": len(model_infos)
            })
            
            return ModelsResponse(
                data=model_infos,
                count=total_count,
                provider=provider.__class__.__name__
            )
            
        except ProviderAuthenticationError as e:
            logger.error("Models retrieval failed - authentication error", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "Provider authentication failed",
                    "message": "Invalid API key or authentication credentials"
                }
            )
            
        except RateLimitExceededError as e:
            logger.error("Models retrieval failed - rate limit exceeded", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Rate limit exceeded",
                    "message": "Too many requests, please try again later"
                }
            )
            
        except AIProviderError as e:
            logger.error("Models retrieval failed - provider error", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error": "Provider error occurred",
                    "message": "Failed to retrieve models from AI provider"
                }
            )
            
        except ChironBaseError as e:
            logger.error("Models retrieval failed - chiron error", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "Service error occurred",
                    "message": "Internal service error while retrieving models"
                }
            )
            
        except Exception as e:
            logger.error("Models retrieval failed - unexpected error", extra={
                "error": str(e)
            })
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "Unexpected error occurred",
                    "message": "An unexpected error occurred while retrieving models"
                }
            )


@router.get("/{model_id}", response_model=ModelInfo, status_code=status.HTTP_200_OK)
async def get_model(model_id: str) -> ModelInfo:
    """
    Get specific model information.
    
    Retrieves detailed information about a specific model by ID.
    
    Args:
        model_id: The unique identifier of the model
        
    Returns:
        ModelInfo containing detailed model information
        
    Raises:
        HTTPException: If model not found or retrieval fails
    """
    with LoggingContext(operation="get_model", model_id=model_id):
        try:
            logger.info("Retrieving model information", extra={
                "model_id": model_id
            })
            
            # Get provider from factory
            provider = ProviderFactory.get_provider()
            
            # Get all models from provider
            models_data = await provider.list_models()
            
            # Find the specific model
            model_data = None
            for model in models_data:
                if model.get("id") == model_id:
                    model_data = model
                    break
            
            if not model_data:
                logger.warning("Model not found", extra={
                    "model_id": model_id
                })
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "error": "Model not found",
                        "message": f"Model '{model_id}' not found in available models"
                    }
                )
            
            model_info = ModelInfo(
                id=model_data.get("id", ""),
                name=model_data.get("name"),
                description=model_data.get("description"),
                pricing=model_data.get("pricing"),
                context_length=model_data.get("context_length")
            )
            
            logger.info("Model information retrieved successfully", extra={
                "provider": provider.__class__.__name__,
                "model_id": model_id
            })
            
            return model_info
            
        except HTTPException:
            # Re-raise HTTP exceptions (like 404)
            raise
            
        except ProviderAuthenticationError as e:
            logger.error("Model retrieval failed - authentication error", extra={
                "error": str(e),
                "model_id": model_id
            })
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "Provider authentication failed",
                    "message": "Invalid API key or authentication credentials"
                }
            )
            
        except RateLimitExceededError as e:
            logger.error("Model retrieval failed - rate limit exceeded", extra={
                "error": str(e),
                "model_id": model_id
            })
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Rate limit exceeded",
                    "message": "Too many requests, please try again later"
                }
            )
            
        except AIProviderError as e:
            logger.error("Model retrieval failed - provider error", extra={
                "error": str(e),
                "model_id": model_id
            })
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error": "Provider error occurred",
                    "message": "Failed to retrieve model from AI provider"
                }
            )
            
        except ChironBaseError as e:
            logger.error("Model retrieval failed - chiron error", extra={
                "error": str(e),
                "model_id": model_id
            })
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "Service error occurred",
                    "message": "Internal service error while retrieving model"
                }
            )
            
        except Exception as e:
            logger.error("Model retrieval failed - unexpected error", extra={
                "error": str(e),
                "model_id": model_id
            })
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "Unexpected error occurred",
                    "message": "An unexpected error occurred while retrieving model"
                }
            )