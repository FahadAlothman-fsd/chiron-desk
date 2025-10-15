"""Unit tests for OpenRouter client."""

import json
import pytest
from unittest.mock import AsyncMock, Mock, patch
import httpx

from app.services.openrouter_client import OpenRouterClient
from app.services.exceptions import ProviderAuthenticationError


class TestOpenRouterClient:
    """Test cases for OpenRouterClient."""
    
    @pytest.fixture
    def client(self) -> OpenRouterClient:
        """Create OpenRouter client instance for testing."""
        return OpenRouterClient(
            api_key="test-api-key",
            base_url="https://test.openrouter.ai/api/v1",
            timeout=5.0,
            http_referer="https://test.local",
            app_title="TestApp"
        )
    
    def test_client_initialization(self, client: OpenRouterClient) -> None:
        """Test client initialization with configuration."""
        assert client.api_key == "test-api-key"
        assert client.base_url == "https://test.openrouter.ai/api/v1"
        assert client.timeout == 5.0
        assert client.http_referer == "https://test.local"
        assert client.app_title == "TestApp"
        assert client.get_provider_name() == "openrouter"
    
    def test_default_headers(self, client: OpenRouterClient) -> None:
        """Test default headers generation."""
        headers = client._get_default_headers()
        
        assert headers["Authorization"] == "Bearer test-api-key"
        assert headers["HTTP-Referer"] == "https://test.local"
        assert headers["X-Title"] == "TestApp"
        assert headers["Content-Type"] == "application/json"
        assert headers["User-Agent"] == "Chiron/1.0"
    
    @pytest.mark.asyncio
    async def test_list_models_success(self, client: OpenRouterClient) -> None:
        """Test successful model listing."""
        mock_response_data = {
            "data": [
                {"id": "model1", "name": "Model 1"},
                {"id": "model2", "name": "Model 2"}
            ]
        }
        
        mock_response = Mock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status = Mock()
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        models = await client.list_models()
        
        assert len(models) == 2
        assert models[0]["id"] == "model1"
        assert models[1]["id"] == "model2"
        
        client._client.get.assert_called_once_with("/models")
    
    @pytest.mark.asyncio
    async def test_list_models_http_error(self, client: OpenRouterClient) -> None:
        """Test model listing with HTTP error."""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "401 Unauthorized", request=Mock(), response=mock_response
        )
        
        client._client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(ProviderAuthenticationError):
            await client.list_models()
    
    @pytest.mark.asyncio
    async def test_stream_chat_completion_success(self, client: OpenRouterClient) -> None:
        """Test successful streaming chat completion."""
        messages = [{"role": "user", "content": "Hello"}]
        
        # Mock response stream
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        
        # Simulate SSE stream
        stream_data = [
            "data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}",
            "data: {\"choices\":[{\"delta\":{\"content\":\" world\"}}]}",
            "data: [DONE]"
        ]
        
        async def mock_aiter_lines():
            for line in stream_data:
                yield line
        
        mock_response.aiter_lines = mock_aiter_lines
        
        # Create a proper async context manager mock
        mock_stream = AsyncMock()
        mock_stream.__aenter__ = AsyncMock(return_value=mock_response)
        mock_stream.__aexit__ = AsyncMock(return_value=None)
        
        client._client.stream = Mock(return_value=mock_stream)
        
        chunks = []
        async for chunk in client.stream_chat_completion(messages, "model1"):
            chunks.append(chunk)
        
        assert chunks == ["Hello", " world"]
        
        client._client.stream.assert_called_once_with(
            "POST",
            "/chat/completions",
            json={
                "model": "model1",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2000,
                "stream": True
            }
        )
    
    @pytest.mark.asyncio
    async def test_stream_chat_completion_with_custom_params(self, client: OpenRouterClient) -> None:
        """Test streaming chat completion with custom parameters."""
        messages = [{"role": "user", "content": "Hello"}]
        
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        async def mock_aiter_lines():
            yield "data: [DONE]"
        
        mock_response.aiter_lines = mock_aiter_lines
        
        # Mock the async context manager properly
        mock_stream = AsyncMock()
        mock_stream.__aenter__ = AsyncMock(return_value=mock_response)
        mock_stream.__aexit__ = AsyncMock(return_value=None)
        
        client._client.stream = Mock(return_value=mock_stream)
        
        async for _ in client.stream_chat_completion(
            messages, 
            "model1", 
            temperature=0.5, 
            max_tokens=1000,
            top_p=0.9
        ):
            break
        
        client._client.stream.assert_called_once_with(
            "POST",
            "/chat/completions",
            json={
                "model": "model1",
                "messages": messages,
                "temperature": 0.5,
                "max_tokens": 1000,
                "stream": True,
                "top_p": 0.9
            }
        )
    
    @pytest.mark.asyncio
    async def test_stream_chat_completion_http_error(self, client: OpenRouterClient) -> None:
        """Test streaming chat completion with HTTP error."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.text = "Rate limit exceeded"
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "429 Rate limit exceeded", request=Mock(), response=mock_response
        )
        
        # Mock the async context manager properly
        mock_stream = AsyncMock()
        mock_stream.__aenter__ = AsyncMock(return_value=mock_response)
        mock_stream.__aexit__ = AsyncMock(return_value=None)
        
        client._client.stream = Mock(return_value=mock_stream)
        
        messages = [{"role": "user", "content": "Hello"}]
        
        with pytest.raises(httpx.HTTPStatusError):
            async for _ in client.stream_chat_completion(messages, "model1"):
                pass
    
    def test_get_dspy_lm_without_dspy(self, client: OpenRouterClient) -> None:
        """Test DSPy LM creation when DSPy is not installed."""
        with patch.dict('sys.modules', {'dspy': None}):
            with pytest.raises(ImportError, match="DSPy is not installed"):
                client.get_dspy_lm("model1")
    
    def test_get_dspy_lm_with_dspy(self, client: OpenRouterClient) -> None:
        """Test DSPy LM creation when DSPy is installed."""
        mock_dspy = Mock()
        mock_lm = Mock()
        mock_dspy.OpenAI.return_value = mock_lm
        
        with patch.dict('sys.modules', {'dspy': mock_dspy}):
            result = client.get_dspy_lm("model1")
            
            assert result == mock_lm
            mock_dspy.OpenAI.assert_called_once_with(
                model="model1",
                api_key="test-api-key",
                api_base="https://test.openrouter.ai/api/v1",
                default_headers={
                    "HTTP-Referer": "https://test.local",
                    "X-Title": "TestApp"
                }
            )
    
    @pytest.mark.asyncio
    async def test_validate_connection_success(self, client: OpenRouterClient) -> None:
        """Test successful connection validation."""
        client.list_models = AsyncMock(return_value=[{"id": "model1"}])
        
        result = await client.validate_connection()
        
        assert result is True
        client.list_models.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_validate_connection_failure(self, client: OpenRouterClient) -> None:
        """Test connection validation failure."""
        client.list_models = AsyncMock(side_effect=Exception("Connection failed"))
        
        result = await client.validate_connection()
        
        assert result is False
        client.list_models.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_close(self, client: OpenRouterClient) -> None:
        """Test client cleanup."""
        client._client.aclose = AsyncMock()
        
        await client.close()
        
        client._client.aclose.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_async_context_manager(self, client: OpenRouterClient) -> None:
        """Test async context manager functionality."""
        client._client.aclose = AsyncMock()
        
        async with client:
            pass
        
        client._client.aclose.assert_called_once()