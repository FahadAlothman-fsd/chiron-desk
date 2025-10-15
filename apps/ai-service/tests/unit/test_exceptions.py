"""Unit tests for custom exception classes."""

import pytest

from app.services.exceptions import (
    ChironBaseError,
    AIProviderError,
    OpenRouterAPIError,
    RateLimitExceededError,
    ProviderAuthenticationError,
    ProviderConnectionError,
    ProviderTimeoutError,
    ProviderValidationError
)


class TestChironBaseError:
    """Test cases for ChironBaseError."""
    
    def test_basic_initialization(self) -> None:
        """Test basic error initialization."""
        error = ChironBaseError("Test message")
        
        assert error.message == "Test message"
        assert error.details == {}
        assert str(error) == "Test message"
    
    def test_initialization_with_details(self) -> None:
        """Test error initialization with details."""
        details = {"code": 500, "context": "test"}
        error = ChironBaseError("Test message", details)
        
        assert error.message == "Test message"
        assert error.details == details
        assert "Details:" in str(error)
        assert "code" in str(error)
    
    def test_inheritance(self) -> None:
        """Test that ChironBaseError inherits from Exception."""
        error = ChironBaseError("Test")
        assert isinstance(error, Exception)


class TestAIProviderError:
    """Test cases for AIProviderError."""
    
    def test_basic_initialization(self) -> None:
        """Test basic provider error initialization."""
        error = AIProviderError("Provider error")
        
        assert error.message == "Provider error"
        assert error.provider is None
        assert error.details == {}
    
    def test_initialization_with_provider(self) -> None:
        """Test provider error initialization with provider name."""
        error = AIProviderError("Provider error", provider="openrouter")
        
        assert error.provider == "openrouter"
        assert "[openrouter]" in str(error)
    
    def test_initialization_with_details(self) -> None:
        """Test provider error with details."""
        details = {"request_id": "123"}
        error = AIProviderError("Provider error", provider="openrouter", details=details)
        
        assert error.provider == "openrouter"
        assert error.details == details
        assert "[openrouter]" in str(error)
        assert "request_id" in str(error)
    
    def test_inheritance(self) -> None:
        """Test that AIProviderError inherits from ChironBaseError."""
        error = AIProviderError("Test")
        assert isinstance(error, ChironBaseError)
        assert isinstance(error, Exception)


class TestOpenRouterAPIError:
    """Test cases for OpenRouterAPIError."""
    
    def test_basic_initialization(self) -> None:
        """Test basic OpenRouter error initialization."""
        error = OpenRouterAPIError("API error")
        
        assert error.message == "API error"
        assert error.provider == "openrouter"
        assert error.status_code is None
        assert "HTTP" not in str(error)
    
    def test_initialization_with_status_code(self) -> None:
        """Test OpenRouter error with status code."""
        error = OpenRouterAPIError("API error", status_code=429)
        
        assert error.status_code == 429
        assert error.details["status_code"] == 429
        assert "HTTP 429" in str(error)
    
    def test_inheritance(self) -> None:
        """Test that OpenRouterAPIError inherits from AIProviderError."""
        error = OpenRouterAPIError("Test")
        assert isinstance(error, AIProviderError)
        assert isinstance(error, ChironBaseError)


class TestRateLimitExceededError:
    """Test cases for RateLimitExceededError."""
    
    def test_basic_initialization(self) -> None:
        """Test basic rate limit error initialization."""
        error = RateLimitExceededError()
        
        assert error.message == "Rate limit exceeded"
        assert error.retry_after is None
        assert "Retry after:" not in str(error)
    
    def test_custom_message(self) -> None:
        """Test rate limit error with custom message."""
        error = RateLimitExceededError("Custom rate limit message")
        
        assert error.message == "Custom rate limit message"
        assert str(error) == "Custom rate limit message"
    
    def test_initialization_with_retry_after(self) -> None:
        """Test rate limit error with retry_after."""
        error = RateLimitExceededError(retry_after=60)
        
        assert error.retry_after == 60
        assert error.details["retry_after"] == 60
        assert "Retry after: 60s" in str(error)
    
    def test_inheritance(self) -> None:
        """Test that RateLimitExceededError inherits from AIProviderError."""
        error = RateLimitExceededError()
        assert isinstance(error, AIProviderError)
        assert isinstance(error, ChironBaseError)


class TestProviderAuthenticationError:
    """Test cases for ProviderAuthenticationError."""
    
    def test_basic_initialization(self) -> None:
        """Test basic auth error initialization."""
        error = ProviderAuthenticationError()
        
        assert error.message == "Authentication failed"
        assert error.provider is None
    
    def test_custom_message_and_provider(self) -> None:
        """Test auth error with custom message and provider."""
        error = ProviderAuthenticationError(
            "Invalid API key", 
            provider="openrouter"
        )
        
        assert error.message == "Invalid API key"
        assert error.provider == "openrouter"
        assert "[openrouter]" in str(error)
    
    def test_inheritance(self) -> None:
        """Test that ProviderAuthenticationError inherits from AIProviderError."""
        error = ProviderAuthenticationError()
        assert isinstance(error, AIProviderError)
        assert isinstance(error, ChironBaseError)


class TestProviderConnectionError:
    """Test cases for ProviderConnectionError."""
    
    def test_basic_initialization(self) -> None:
        """Test basic connection error initialization."""
        error = ProviderConnectionError()
        
        assert error.message == "Connection error"
        assert error.provider is None
    
    def test_custom_message_and_provider(self) -> None:
        """Test connection error with custom message and provider."""
        error = ProviderConnectionError(
            "Network unreachable", 
            provider="openrouter"
        )
        
        assert error.message == "Network unreachable"
        assert error.provider == "openrouter"
        assert "[openrouter]" in str(error)
    
    def test_inheritance(self) -> None:
        """Test that ProviderConnectionError inherits from AIProviderError."""
        error = ProviderConnectionError()
        assert isinstance(error, AIProviderError)
        assert isinstance(error, ChironBaseError)


class TestProviderTimeoutError:
    """Test cases for ProviderTimeoutError."""
    
    def test_basic_initialization(self) -> None:
        """Test basic timeout error initialization."""
        error = ProviderTimeoutError()
        
        assert error.message == "Request timeout"
        assert error.provider is None
        assert error.timeout_seconds is None
    
    def test_initialization_with_timeout(self) -> None:
        """Test timeout error with timeout seconds."""
        error = ProviderTimeoutError(
            timeout_seconds=30.0,
            provider="openrouter"
        )
        
        assert error.timeout_seconds == 30.0
        assert error.provider == "openrouter"
        assert error.details["timeout_seconds"] == 30.0
        assert "Timeout: 30.0s" in str(error)
    
    def test_inheritance(self) -> None:
        """Test that ProviderTimeoutError inherits from AIProviderError."""
        error = ProviderTimeoutError()
        assert isinstance(error, AIProviderError)
        assert isinstance(error, ChironBaseError)


class TestProviderValidationError:
    """Test cases for ProviderValidationError."""
    
    def test_basic_initialization(self) -> None:
        """Test basic validation error initialization."""
        error = ProviderValidationError("Invalid input")
        
        assert error.message == "Invalid input"
        assert error.field is None
        assert error.value is None
    
    def test_initialization_with_field_and_value(self) -> None:
        """Test validation error with field and value."""
        error = ProviderValidationError(
            "Invalid temperature",
            field="temperature",
            value="invalid"
        )
        
        assert error.message == "Invalid temperature"
        assert error.field == "temperature"
        assert error.value == "invalid"
        assert error.details["field"] == "temperature"
        assert error.details["value"] == "invalid"
        assert "Field: temperature" in str(error)
    
    def test_inheritance(self) -> None:
        """Test that ProviderValidationError inherits from AIProviderError."""
        error = ProviderValidationError("Test")
        assert isinstance(error, AIProviderError)
        assert isinstance(error, ChironBaseError)