"""
Unit tests for models router.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.services.exceptions import (
    ProviderAuthenticationError,
    RateLimitExceededError,
    AIProviderError,
    ChironBaseError
)

client = TestClient(app)


class TestListModelsEndpoint:
    """Test cases for GET /models/models endpoint."""

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_list_models_success(self, mock_get_provider):
        """Test successful models listing."""
        mock_provider = AsyncMock()
        mock_provider.__class__.__name__ = "OpenRouterClient"
        mock_provider.list_models.return_value = [
            {
                "id": "gpt-4",
                "name": "GPT-4",
                "description": "OpenAI's GPT-4 model",
                "pricing": {"prompt": 0.03, "completion": 0.06},
                "context_length": 8192
            },
            {
                "id": "claude-3",
                "name": "Claude 3",
                "description": "Anthropic's Claude 3 model",
                "pricing": {"prompt": 0.015, "completion": 0.075},
                "context_length": 100000
            }
        ]
        mock_get_provider.return_value = mock_provider

        response = client.get("/models/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["provider"] == "OpenRouterClient"
        assert data["count"] == 2
        assert len(data["data"]) == 2
        
        model1 = data["data"][0]
        assert model1["id"] == "gpt-4"
        assert model1["name"] == "GPT-4"
        assert model1["description"] == "OpenAI's GPT-4 model"
        assert model1["pricing"]["prompt"] == 0.03
        assert model1["context_length"] == 8192

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_list_models_with_pagination(self, mock_get_provider):
        """Test models listing with pagination."""
        mock_provider = AsyncMock()
        mock_provider.__class__.__name__ = "OpenRouterClient"
        
        # Create 5 models
        models = []
        for i in range(5):
            models.append({
                "id": f"model-{i}",
                "name": f"Model {i}",
                "description": f"Description {i}"
            })
        
        mock_provider.list_models.return_value = models
        mock_get_provider.return_value = mock_provider

        # Test with limit=2, offset=1
        response = client.get("/models/?limit=2&offset=1")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 5
        assert len(data["data"]) == 2
        assert data["data"][0]["id"] == "model-1"
        assert data["data"][1]["id"] == "model-2"

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_list_models_authentication_error(self, mock_get_provider):
        """Test models listing with authentication error."""
        mock_get_provider.side_effect = ProviderAuthenticationError("Invalid API key")

        response = client.get("/models/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data["detail"]["error"] == "Provider authentication failed"
        assert "Invalid API key" in data["detail"]["message"]

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_list_models_rate_limit_error(self, mock_get_provider):
        """Test models listing with rate limit error."""
        mock_get_provider.side_effect = RateLimitExceededError("Rate limit exceeded")

        response = client.get("/models/")

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        data = response.json()
        assert data["detail"]["error"] == "Rate limit exceeded"
        assert "please try again later" in data["detail"]["message"]

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_list_models_provider_error(self, mock_get_provider):
        """Test models listing with provider error."""
        mock_get_provider.side_effect = AIProviderError("Provider error")

        response = client.get("/models/")

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        data = response.json()
        assert data["detail"]["error"] == "Provider error occurred"
        assert "Failed to retrieve model" in data["detail"]["message"]

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_list_models_chiron_error(self, mock_get_provider):
        """Test models listing with chiron error."""
        mock_get_provider.side_effect = ChironBaseError("Service error")

        response = client.get("/models/")

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.json()
        assert data["detail"]["error"] == "Service error occurred"
        assert "Internal service error" in data["detail"]["message"]

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_list_models_unexpected_error(self, mock_get_provider):
        """Test models listing with unexpected error."""
        mock_get_provider.side_effect = Exception("Unexpected error")

        response = client.get("/models/")

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.json()
        assert data["detail"]["error"] == "Unexpected error occurred"
        assert "An unexpected error occurred" in data["detail"]["message"]

    def test_list_models_invalid_limit(self):
        """Test models listing with invalid limit parameter."""
        response = client.get("/models/?limit=0")

        # FastAPI handles validation errors automatically
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_list_models_invalid_offset(self):
        """Test models listing with invalid offset parameter."""
        response = client.get("/models/?offset=-1")

        # FastAPI handles validation errors automatically
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGetModelEndpoint:
    """Test cases for GET /models/{model_id} endpoint."""

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_get_model_success(self, mock_get_provider):
        """Test successful model retrieval."""
        mock_provider = AsyncMock()
        mock_provider.__class__.__name__ = "OpenRouterClient"
        mock_provider.list_models.return_value = [
            {
                "id": "gpt-4",
                "name": "GPT-4",
                "description": "OpenAI's GPT-4 model",
                "pricing": {"prompt": 0.03, "completion": 0.06},
                "context_length": 8192
            },
            {
                "id": "claude-3",
                "name": "Claude 3",
                "description": "Anthropic's Claude 3 model"
            }
        ]
        mock_get_provider.return_value = mock_provider

        response = client.get("/models/gpt-4")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == "gpt-4"
        assert data["name"] == "GPT-4"
        assert data["description"] == "OpenAI's GPT-4 model"
        assert data["pricing"]["prompt"] == 0.03
        assert data["context_length"] == 8192

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_get_model_not_found(self, mock_get_provider):
        """Test model retrieval when model not found."""
        mock_provider = AsyncMock()
        mock_provider.__class__.__name__ = "OpenRouterClient"
        mock_provider.list_models.return_value = [
            {
                "id": "gpt-4",
                "name": "GPT-4"
            }
        ]
        mock_get_provider.return_value = mock_provider

        response = client.get("/models/nonexistent-model")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data["detail"]["error"] == "Model not found"
        assert "nonexistent-model" in data["detail"]["message"]

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_get_model_authentication_error(self, mock_get_provider):
        """Test model retrieval with authentication error."""
        mock_get_provider.side_effect = ProviderAuthenticationError("Invalid API key")

        response = client.get("/models/gpt-4")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data["detail"]["error"] == "Provider authentication failed"

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_get_model_rate_limit_error(self, mock_get_provider):
        """Test model retrieval with rate limit error."""
        mock_get_provider.side_effect = RateLimitExceededError("Rate limit exceeded")

        response = client.get("/models/gpt-4")

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        data = response.json()
        assert data["detail"]["error"] == "Rate limit exceeded"

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_get_model_provider_error(self, mock_get_provider):
        """Test model retrieval with provider error."""
        mock_get_provider.side_effect = AIProviderError("Provider error")

        response = client.get("/models/gpt-4")

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        data = response.json()
        assert data["detail"]["error"] == "Provider error occurred"

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_get_model_chiron_error(self, mock_get_provider):
        """Test model retrieval with chiron error."""
        mock_get_provider.side_effect = ChironBaseError("Service error")

        response = client.get("/models/gpt-4")

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.json()
        assert data["detail"]["error"] == "Service error occurred"

    @patch('app.routers.models.ProviderFactory.get_provider')
    def test_get_model_unexpected_error(self, mock_get_provider):
        """Test model retrieval with unexpected error."""
        mock_get_provider.side_effect = Exception("Unexpected error")

        response = client.get("/models/gpt-4")

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.json()
        assert data["detail"]["error"] == "Unexpected error occurred"


class TestRouterIntegration:
    """Test cases for router integration."""

    def test_router_prefix(self):
        """Test that router has correct prefix."""
        from app.routers.models import router
        assert router.prefix == "/models"

    def test_router_tags(self):
        """Test that router has correct tags."""
        from app.routers.models import router
        assert "models" in router.tags

    def test_endpoint_paths(self):
        """Test that endpoints have correct paths."""
        from app.routers.models import router
        
        # Get all route paths
        paths = [route.path for route in router.routes]
        
        assert "/models/" in paths
        assert "/models/{model_id}" in paths


class TestModelInfoResponse:
    """Test cases for ModelInfo response model."""

    def test_model_info_with_all_fields(self):
        """Test ModelInfo with all fields populated."""
        from app.routers.models import ModelInfo
        
        model_info = ModelInfo(
            id="gpt-4",
            name="GPT-4",
            description="OpenAI's GPT-4 model",
            pricing={"prompt": 0.03, "completion": 0.06},
            context_length=8192
        )
        
        assert model_info.id == "gpt-4"
        assert model_info.name == "GPT-4"
        assert model_info.description == "OpenAI's GPT-4 model"
        assert model_info.pricing["prompt"] == 0.03
        assert model_info.context_length == 8192

    def test_model_info_with_required_fields_only(self):
        """Test ModelInfo with only required fields."""
        from app.routers.models import ModelInfo
        
        model_info = ModelInfo(id="gpt-4")
        
        assert model_info.id == "gpt-4"
        assert model_info.name is None
        assert model_info.description is None
        assert model_info.pricing is None
        assert model_info.context_length is None


class TestModelsResponse:
    """Test cases for ModelsResponse model."""

    def test_models_response(self):
        """Test ModelsResponse structure."""
        from app.routers.models import ModelsResponse, ModelInfo
        
        model_infos = [
            ModelInfo(id="gpt-4", name="GPT-4"),
            ModelInfo(id="claude-3", name="Claude 3")
        ]
        
        response = ModelsResponse(
            data=model_infos,
            count=2,
            provider="OpenRouterClient"
        )
        
        assert response.count == 2
        assert response.provider == "OpenRouterClient"
        assert len(response.data) == 2
        assert response.data[0].id == "gpt-4"
        assert response.data[1].id == "claude-3"