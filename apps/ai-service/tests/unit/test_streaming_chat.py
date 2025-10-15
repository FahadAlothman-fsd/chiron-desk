"""
Unit tests for streaming chat completion functionality.
"""

import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.services.openrouter_client import OpenRouterClient
from app.services.exceptions import (
    ProviderAuthenticationError,
    RateLimitExceededError,
    AIProviderError,
    OpenRouterAPIError
)


class MockAsyncContextManager:
    """Helper class to create async context manager mocks."""
    
    def __init__(self, return_value):
        self.return_value = return_value
        self._enter_called = False
        self._exit_called = False
    
    async def __aenter__(self):
        self._enter_called = True
        return self.return_value
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self._exit_called = True
        return None


class MockAsyncIterator:
    """Helper class to create async iterator mocks."""
    
    def __init__(self, items):
        self.items = items
        self.index = 0
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        if self.index >= len(self.items):
            raise StopAsyncIteration
        item = self.items[self.index]
        self.index += 1
        return item


class TestStreamingChatCompletion:
    """Test cases for streaming chat completion."""

    @pytest.fixture
    def client(self):
        """Create OpenRouter client instance for testing."""
        return OpenRouterClient(
            api_key="test-api-key",
            base_url="https://openrouter.ai/api/v1",
            timeout=30.0
        )

    @pytest.fixture
    def sample_messages(self):
        """Sample messages for testing."""
        return [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello, how are you?"}
        ]

    @pytest.fixture
    def mock_stream_response(self):
        """Mock streaming response with SSE chunks."""
        chunks = [
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"role\": \"assistant\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"Hello\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"!\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \" How\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \" can\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \" I\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \" help\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \" you\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"?\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {}, \"finish_reason\": \"stop\"}]}\n\n",
            "data: [DONE]\n\n"
        ]
        return chunks

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_success(self, client, sample_messages, mock_stream_response):
        """Test successful streaming chat completion."""
        # Mock the streaming response
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.aiter_lines.return_value = MockAsyncIterator(mock_stream_response)

        # Mock the stream method to return our async context manager
        client._client.stream = MagicMock(return_value=MockAsyncContextManager(mock_response))

        # Test streaming
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4",
            temperature=0.7,
            max_tokens=100
        )

        # Collect chunks
        chunks = []
        async for chunk in stream:
            chunks.append(chunk)

        # Verify we got the expected content chunks
        assert len(chunks) == 8  # We expect 8 content chunks from the mock data
        assert chunks[0] == "Hello"
        assert chunks[1] == "!"
        # Verify the complete message when combined
        complete_message = "".join(chunks)
        assert "Hello" in complete_message
        assert "How can I help you?" in complete_message

        # Verify the request was made correctly
        client._client.stream.assert_called_once_with(
            "POST",
            "/chat/completions",
            json={
                "model": "openai/gpt-4",
                "messages": sample_messages,
                "temperature": 0.7,
                "max_tokens": 100,
                "stream": True
            }
        )

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_with_empty_content(self, client, sample_messages):
        """Test streaming with empty content chunks."""
        chunks = [
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"Hello\"}, \"finish_reason\": null}]}\n\n",
            "data: [DONE]\n\n"
        ]

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.aiter_lines.return_value = MockAsyncIterator(chunks)

        client._client.stream = MagicMock(return_value=MockAsyncContextManager(mock_response))

        # Test streaming
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4"
        )

        # Collect chunks
        chunks = []
        async for chunk in stream:
            chunks.append(chunk)

        # Verify only non-empty content chunks are yielded
        assert chunks == ["Hello"]

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_authentication_error(self, client, sample_messages):
        """Test streaming with authentication error."""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Authentication failed", 
            request=MagicMock(), 
            response=MagicMock(status_code=401, text="Unauthorized")
        )

        client._client.stream = MagicMock(return_value=MockAsyncContextManager(mock_response))

        # Test authentication error
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4"
        )

        with pytest.raises(httpx.HTTPStatusError):
            async for _ in stream:
                pass

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_rate_limit_error(self, client, sample_messages):
        """Test streaming with rate limit error."""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Rate limit exceeded", 
            request=MagicMock(), 
            response=MagicMock(status_code=429, text="Too Many Requests")
        )

        client._client.stream = MagicMock(return_value=MockAsyncContextManager(mock_response))

        # Test rate limit error
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4"
        )

        with pytest.raises(httpx.HTTPStatusError):
            async for _ in stream:
                pass

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_request_error(self, client, sample_messages):
        """Test streaming with request error."""
        # Mock the stream method to raise an error when called
        client._client.stream = MagicMock(side_effect=httpx.RequestError("Connection failed"))

        # Test request error
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4"
        )

        with pytest.raises(httpx.RequestError):
            async for _ in stream:
                pass

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_malformed_json(self, client, sample_messages):
        """Test streaming with malformed JSON in response."""
        chunks = [
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"Hello\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"invalid\": json}\n\n",  # Malformed JSON
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"!\"}, \"finish_reason\": null}]}\n\n",
            "data: [DONE]\n\n"
        ]

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.aiter_lines.return_value = MockAsyncIterator(chunks)

        client._client.stream = MagicMock(return_value=MockAsyncContextManager(mock_response))

        # Test streaming with malformed JSON
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4"
        )

        # Should continue processing valid chunks despite malformed JSON
        chunks = []
        async for chunk in stream:
            chunks.append(chunk)

        assert chunks == ["Hello", "!"]

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_empty_lines(self, client, sample_messages):
        """Test streaming with empty lines in response."""
        chunks = [
            "",  # Empty line
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"Hello\"}, \"finish_reason\": null}]}\n\n",
            "\n",  # Another empty line
            "data: [DONE]\n\n",
            ""  # Final empty line
        ]

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.aiter_lines.return_value = MockAsyncIterator(chunks)

        client._client.stream = MagicMock(return_value=MockAsyncContextManager(mock_response))

        # Test streaming with empty lines
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4"
        )

        chunks = []
        async for chunk in stream:
            chunks.append(chunk)

        assert chunks == ["Hello"]

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_no_choices(self, client, sample_messages):
        """Test streaming with response that has no choices."""
        chunks = [
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\"}\n\n",  # No choices
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": []}\n\n",  # Empty choices
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"Hello\"}, \"finish_reason\": null}]}\n\n",
            "data: [DONE]\n\n"
        ]

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.aiter_lines.return_value = MockAsyncIterator(chunks)

        client._client.stream = MagicMock(return_value=MockAsyncContextManager(mock_response))

        # Test streaming with no choices
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4"
        )

        chunks = []
        async for chunk in stream:
            chunks.append(chunk)

        assert chunks == ["Hello"]

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_with_additional_kwargs(self, client, sample_messages):
        """Test streaming with additional kwargs."""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.aiter_lines.return_value = MockAsyncIterator(["data: [DONE]\n\n"])

        client._client.stream = MagicMock(return_value=MockAsyncContextManager(mock_response))

        # Test streaming with additional parameters
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4",
            temperature=0.7,
            max_tokens=100,
            top_p=0.9,
            frequency_penalty=0.1,
            presence_penalty=0.1
        )

        # Consume the stream
        async for _ in stream:
            pass

        # Verify additional kwargs were included
        client._client.stream.assert_called_once_with(
            "POST",
            "/chat/completions",
            json={
                "model": "openai/gpt-4",
                "messages": sample_messages,
                "temperature": 0.7,
                "max_tokens": 100,
                "stream": True,
                "top_p": 0.9,
                "frequency_penalty": 0.1,
                "presence_penalty": 0.1
            }
        )

    @pytest.mark.asyncio
    async def test_streaming_chat_completion_early_termination(self, client, sample_messages):
        """Test streaming when client terminates early."""
        chunks = [
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"Hello\"}, \"finish_reason\": null}]}\n\n",
            "data: {\"id\": \"chatcmpl-123\", \"object\": \"chat.completion.chunk\", \"created\": 1234567890, \"model\": \"openai/gpt-4\", \"choices\": [{\"index\": 0, \"delta\": {\"content\": \"!\"}, \"finish_reason\": null}]}\n\n",
            # No [DONE] signal - stream terminates early
        ]

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.aiter_lines.return_value = MockAsyncIterator(chunks)

        client._client.stream = MagicMock(return_value=MockAsyncContextManager(mock_response))

        # Test streaming with early termination
        stream = client.stream_chat_completion(
            messages=sample_messages,
            model="openai/gpt-4"
        )

        chunks = []
        async for chunk in stream:
            chunks.append(chunk)
            if len(chunks) >= 2:  # Stop early
                break

        assert chunks == ["Hello", "!"]