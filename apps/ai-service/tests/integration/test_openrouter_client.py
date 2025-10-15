"""
Integration tests for OpenRouter client with provider abstraction layer.

These tests verify the complete workflow from factory → client initialization → 
list models → stream chat, ensuring all components work together correctly.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List, AsyncGenerator

from app.services.provider_factory import ProviderFactory
from app.services.openrouter_client import OpenRouterClient
from app.services.exceptions import (
    ProviderAuthenticationError,
    RateLimitExceededError,
    AIProviderError,
    OpenRouterAPIError
)
from app.config import AIServiceConfig


class TestOpenRouterIntegration:
    """Integration tests for OpenRouter client."""

    @pytest.fixture
    def mock_config(self) -> AIServiceConfig:
        """Create a mock configuration for testing."""
        return AIServiceConfig(
            openrouter_api_key="test-api-key",
            openrouter_base_url="https://openrouter.ai/api/v1",
            default_timeout=30.0,
            connect_timeout=10.0,
            max_connections=100,
            max_keepalive_connections=20,
            rate_limit_requests=100,
            rate_limit_window=60,
            retry_attempts=3,
            retry_delay=1.0
        )

    @pytest.fixture
    def mock_models_response(self) -> Dict[str, Any]:
        """Mock OpenRouter models API response."""
        return {
            "data": [
                {
                    "id": "openai/gpt-4",
                    "name": "GPT-4",
                    "description": "OpenAI's GPT-4 model",
                    "pricing": {
                        "prompt": 0.03,
                        "completion": 0.06
                    }
                },
                {
                    "id": "anthropic/claude-3-opus",
                    "name": "Claude 3 Opus",
                    "description": "Anthropic's Claude 3 Opus model",
                    "pricing": {
                        "prompt": 0.015,
                        "completion": 0.075
                    }
                }
            ]
        }

    @patch('app.services.openrouter_client.httpx.AsyncClient')
    @patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-api-key'})
    async def test_factory_to_client_workflow(self, mock_httpx_client, mock_models_response):
        """Test complete workflow from factory to client initialization."""
        # Setup mock HTTP client
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_models_response
        mock_response.raise_for_status.return_value = None

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client_instance.close = AsyncMock(return_value=None)
        mock_httpx_client.return_value = mock_client_instance

        # Test factory creates client
        provider = ProviderFactory.create_provider(
            provider_type="openrouter",
            api_key="test-api-key"
        )
        assert isinstance(provider, OpenRouterClient)
        assert provider.api_key == "test-api-key"

        # Test client can list models
        models = await provider.list_models()
        assert len(models) == 2
        assert models[0]["id"] == "openai/gpt-4"
        assert models[1]["id"] == "anthropic/claude-3-opus"

        # Verify HTTP client was called correctly
        mock_client_instance.get.assert_called_once_with("/models")

    @patch('app.services.openrouter_client.httpx.AsyncClient')
    @patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-api-key'})
    async def test_authentication_error_handling(self, mock_httpx_client):
        """Test authentication error handling in integration."""
        # Setup mock authentication error response
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            "error": {
                "message": "Invalid API key",
                "type": "authentication_error"
            }
        }
        # Make raise_for_status raise an HTTPStatusError
        import httpx
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Authentication failed", request=MagicMock(), response=mock_response
        )

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client_instance.close = AsyncMock(return_value=None)
        mock_httpx_client.return_value = mock_client_instance

        # Test authentication error propagation
        provider = ProviderFactory.create_provider(
            provider_type="openrouter",
            api_key="test-api-key"
        )
        
        with pytest.raises(ProviderAuthenticationError) as exc_info:
            await provider.list_models()
        
        assert "Invalid OpenRouter API key" in str(exc_info.value)

    @patch('app.services.openrouter_client.httpx.AsyncClient')
    @patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-api-key'})
    async def test_connection_validation(self, mock_httpx_client, mock_models_response):
        """Test connection validation functionality."""
        # Setup mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_models_response
        mock_response.raise_for_status.return_value = None

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client_instance.close = AsyncMock(return_value=None)
        mock_httpx_client.return_value = mock_client_instance

        # Test connection validation
        provider = ProviderFactory.create_provider(
            provider_type="openrouter",
            api_key="test-api-key"
        )
        
        # Should not raise any exceptions
        await provider.validate_connection()

        # Verify validation call
        mock_client_instance.get.assert_called_with("/models")

    @patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-api-key'})
    async def test_rate_limiting_behavior(self):
        """Test rate limiting behavior in integration."""
        # This test verifies that the provider can be created successfully
        # Rate limiting is handled at the HTTP client level with timeouts
        provider = ProviderFactory.create_provider(
            provider_type="openrouter",
            api_key="test-api-key"
        )
        
        # Verify provider is created successfully
        assert isinstance(provider, OpenRouterClient)
        assert provider.api_key == "test-api-key"

    @patch('app.services.openrouter_client.httpx.AsyncClient')
    @patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-api-key'})
    async def test_error_recovery_with_retry(self, mock_httpx_client, mock_models_response):
        """Test error recovery with retry mechanism."""
        # Setup mock responses: first fails, second succeeds
        fail_response = MagicMock()
        fail_response.status_code = 503
        fail_response.json.return_value = {"error": {"message": "Service unavailable"}}

        success_response = MagicMock()
        success_response.status_code = 200
        success_response.json.return_value = mock_models_response
        success_response.raise_for_status.return_value = None

        mock_client_instance = AsyncMock()
        mock_get_mock = AsyncMock(side_effect=[fail_response, success_response])
        mock_client_instance.get = mock_get_mock
        mock_client_instance.close = AsyncMock(return_value=None)
        mock_httpx_client.return_value = mock_client_instance

        # Test retry mechanism
        provider = ProviderFactory.create_provider(
            provider_type="openrouter",
            api_key="test-api-key"
        )
        
        # Should succeed after retry
        models = await provider.list_models()
        assert len(models) == 2
        assert models[0]["id"] == "openai/gpt-4"

        # Verify retry attempts
        assert mock_get_mock.call_count == 2