"""Unit tests for models list retrieval functionality."""

import json
import pytest
from unittest.mock import AsyncMock, Mock
import httpx

from app.services.openrouter_client import OpenRouterClient
from app.services.exceptions import (
    OpenRouterAPIError,
    ProviderAuthenticationError,
    RateLimitExceededError,
    ProviderConnectionError,
    ProviderTimeoutError
)


class TestModelsRetrieval:
    """Test cases for models list retrieval."""
    
    @pytest.fixture
    def client(self) -> OpenRouterClient:
        """Create OpenRouter client for testing."""
        return OpenRouterClient(api_key="test-api-key")
    
    @pytest.mark.asyncio
    async def test_list_models_success(self, client: OpenRouterClient) -> None:
        """Test successful models list retrieval."""
        mock_response_data = {
            "data": [
                {"id": "openai/gpt-3.5-turbo", "name": "GPT-3.5 Turbo"},
                {"id": "anthropic/claude-3-sonnet", "name": "Claude 3 Sonnet"},
                {"id": "google/gemini-pro", "name": "Gemini Pro"}
            ]
        }
        
        mock_response = Mock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status = Mock()
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        models = await client.list_models()
        
        assert len(models) == 3
        assert models[0]["id"] == "openai/gpt-3.5-turbo"
        assert models[1]["id"] == "anthropic/claude-3-sonnet"
        assert models[2]["id"] == "google/gemini-pro"
        
        client._client.get.assert_called_once_with("/models")
    
    @pytest.mark.asyncio
    async def test_list_models_empty_response(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with empty response."""
        mock_response_data = {"data": []}
        
        mock_response = Mock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status = Mock()
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        models = await client.list_models()
        
        assert models == []
    
    @pytest.mark.asyncio
    async def test_list_models_missing_data_field(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with missing data field."""
        mock_response_data = {"models": []}  # Wrong field name
        
        mock_response = Mock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status = Mock()
        mock_response.status_code = 200
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(OpenRouterAPIError) as exc_info:
            await client.list_models()
        
        assert "missing 'data' field" in str(exc_info.value)
        assert exc_info.value.status_code == 200
        assert "response_keys" in exc_info.value.details
    
    @pytest.mark.asyncio
    async def test_list_models_invalid_data_type(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with invalid data type."""
        mock_response_data = {"data": "not-a-list"}
        
        mock_response = Mock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status = Mock()
        mock_response.status_code = 200
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(OpenRouterAPIError) as exc_info:
            await client.list_models()
        
        assert "'data' field is not a list" in str(exc_info.value)
        assert exc_info.value.details["data_type"] == "str"
    
    @pytest.mark.asyncio
    async def test_list_models_authentication_error(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with authentication error."""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized: Invalid API key"
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "401 Unauthorized", request=Mock(), response=mock_response
        )
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(ProviderAuthenticationError) as exc_info:
            await client.list_models()
        
        assert "Invalid OpenRouter API key" in str(exc_info.value)
        assert exc_info.value.provider == "openrouter"
        assert exc_info.value.details["status_code"] == 401
    
    @pytest.mark.asyncio
    async def test_list_models_rate_limit_error(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with rate limit error."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.text = "Rate limit exceeded"
        mock_response.headers = {"Retry-After": "60"}
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "429 Rate limit exceeded", request=Mock(), response=mock_response
        )
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(RateLimitExceededError) as exc_info:
            await client.list_models()
        
        assert "Rate limit exceeded" in str(exc_info.value)
        assert exc_info.value.retry_after == 60
        assert exc_info.value.details["status_code"] == 429
    
    @pytest.mark.asyncio
    async def test_list_models_rate_limit_error_no_retry_after(self, client: OpenRouterClient) -> None:
        """Test rate limit error without Retry-After header."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.text = "Rate limit exceeded"
        mock_response.headers = {}  # No Retry-After header
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "429 Rate limit exceeded", request=Mock(), response=mock_response
        )
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(RateLimitExceededError) as exc_info:
            await client.list_models()
        
        assert exc_info.value.retry_after is None
    
    @pytest.mark.asyncio
    async def test_list_models_server_error(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with server error."""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal server error"
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "500 Internal server error", request=Mock(), response=mock_response
        )
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(OpenRouterAPIError) as exc_info:
            await client.list_models()
        
        assert "server error" in str(exc_info.value).lower()
        assert exc_info.value.status_code == 500
    
    @pytest.mark.asyncio
    async def test_list_models_timeout_error(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with timeout error."""
        client._client.get = AsyncMock(side_effect=httpx.TimeoutException("Request timeout"))
        
        with pytest.raises(ProviderTimeoutError) as exc_info:
            await client.list_models()
        
        assert "timeout" in str(exc_info.value).lower()
        assert exc_info.value.provider == "openrouter"
        assert exc_info.value.timeout_seconds == client.timeout
    
    @pytest.mark.asyncio
    async def test_list_models_connection_error(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with connection error."""
        client._client.get = AsyncMock(side_effect=httpx.ConnectError("Connection failed"))
        
        with pytest.raises(ProviderConnectionError) as exc_info:
            await client.list_models()
        
        assert "Failed to connect" in str(exc_info.value)
        assert exc_info.value.provider == "openrouter"
    
    @pytest.mark.asyncio
    async def test_list_models_request_error(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with general request error."""
        client._client.get = AsyncMock(side_effect=httpx.RequestError("Network error"))
        
        with pytest.raises(ProviderConnectionError) as exc_info:
            await client.list_models()
        
        assert "Network error" in str(exc_info.value)
        assert exc_info.value.provider == "openrouter"
    
    @pytest.mark.asyncio
    async def test_list_models_json_decode_error(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with JSON decode error."""
        mock_response = Mock()
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_response.raise_for_status = Mock()
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(OpenRouterAPIError) as exc_info:
            await client.list_models()
        
        assert "Invalid JSON response" in str(exc_info.value)
        assert "json_error" in exc_info.value.details
    
    @pytest.mark.asyncio
    async def test_list_models_http_error_other(self, client: OpenRouterClient) -> None:
        """Test models list retrieval with other HTTP error."""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Bad request"
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "400 Bad request", request=Mock(), response=mock_response
        )
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(OpenRouterAPIError) as exc_info:
            await client.list_models()
        
        assert "HTTP error fetching models" in str(exc_info.value)
        assert exc_info.value.status_code == 400
    
    @pytest.mark.asyncio
    async def test_list_models_response_truncation(self, client: OpenRouterClient) -> None:
        """Test that long error responses are truncated in details."""
        long_error_text = "x" * 300  # 300 characters
        
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = long_error_text
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "500 Internal server error", request=Mock(), response=mock_response
        )
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(OpenRouterAPIError) as exc_info:
            await client.list_models()
        
        # Response should be truncated to 200 characters
        assert len(exc_info.value.details["response"]) <= 200
        assert exc_info.value.details["response"].endswith("...") or len(exc_info.value.details["response"]) == 200