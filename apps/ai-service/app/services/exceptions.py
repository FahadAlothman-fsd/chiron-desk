"""Custom exception classes for AI provider operations.

This module defines the exception hierarchy for AI provider errors,
providing specific error types for different failure scenarios
and enabling better error handling and user feedback.
"""


class ChironBaseError(Exception):
    """Base error for Chiron AI service.
    
    All custom exceptions in the AI service should inherit from this base class
    to enable consistent error handling and logging.
    """
    
    def __init__(self, message: str, details: dict | None = None) -> None:
        """
        Initialize base error.
        
        Args:
            message: Error message
            details: Additional error details (optional)
        """
        super().__init__(message)
        self.message = message
        self.details = details or {}
    
    def __str__(self) -> str:
        """String representation of the error."""
        if self.details:
            return f"{self.message} (Details: {self.details})"
        return self.message


class AIProviderError(ChironBaseError):
    """Base error for AI provider operations.
    
    This is the base class for all provider-specific errors and provides
    common functionality for provider error handling.
    """
    
    def __init__(self, message: str, provider: str | None = None, details: dict | None = None) -> None:
        """
        Initialize AI provider error.
        
        Args:
            message: Error message
            provider: Provider name (optional)
            details: Additional error details (optional)
        """
        super().__init__(message, details)
        self.provider = provider
    
    def __str__(self) -> str:
        """String representation of the error."""
        base_msg = super().__str__()
        if self.provider:
            return f"[{self.provider}] {base_msg}"
        return base_msg


class OpenRouterAPIError(AIProviderError):
    """Error from OpenRouter API.
    
    Raised when the OpenRouter API returns an error response
    or when there are issues specific to OpenRouter integration.
    """
    
    def __init__(self, message: str, status_code: int | None = None, details: dict | None = None) -> None:
        """
        Initialize OpenRouter API error.
        
        Args:
            message: Error message
            status_code: HTTP status code (optional)
            details: Additional error details (optional)
        """
        super().__init__(message, provider="openrouter", details=details)
        self.status_code = status_code
        
        # Add status code to details if provided
        if status_code is not None:
            self.details["status_code"] = status_code
    
    def __str__(self) -> str:
        """String representation of the error."""
        base_msg = super().__str__()
        if self.status_code:
            return f"{base_msg} (HTTP {self.status_code})"
        return base_msg


class RateLimitExceededError(AIProviderError):
    """Rate limit exceeded error.
    
    Raised when the provider rate limit has been exceeded and the request
    cannot be processed at this time.
    """
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int | None = None, details: dict | None = None) -> None:
        """
        Initialize rate limit error.
        
        Args:
            message: Error message
            retry_after: Seconds to wait before retrying (optional)
            details: Additional error details (optional)
        """
        super().__init__(message, details=details)
        self.retry_after = retry_after
        
        # Add retry_after to details if provided
        if retry_after is not None:
            self.details["retry_after"] = retry_after
    
    def __str__(self) -> str:
        """String representation of the error."""
        base_msg = super().__str__()
        if self.retry_after:
            return f"{base_msg} (Retry after: {self.retry_after}s)"
        return base_msg


class ProviderAuthenticationError(AIProviderError):
    """Authentication failed with provider.
    
    Raised when API key authentication fails or the API key is invalid.
    """
    
    def __init__(self, message: str = "Authentication failed", provider: str | None = None, details: dict | None = None) -> None:
        """
        Initialize authentication error.
        
        Args:
            message: Error message
            provider: Provider name (optional)
            details: Additional error details (optional)
        """
        super().__init__(message, provider=provider, details=details)


class ProviderConnectionError(AIProviderError):
    """Connection error with provider.
    
    Raised when there are network connectivity issues or the provider
    endpoint is unreachable.
    """
    
    def __init__(self, message: str = "Connection error", provider: str | None = None, details: dict | None = None) -> None:
        """
        Initialize connection error.
        
        Args:
            message: Error message
            provider: Provider name (optional)
            details: Additional error details (optional)
        """
        super().__init__(message, provider=provider, details=details)


class ProviderTimeoutError(AIProviderError):
    """Timeout error with provider.
    
    Raised when a provider request times out.
    """
    
    def __init__(self, message: str = "Request timeout", provider: str | None = None, timeout_seconds: float | None = None, details: dict | None = None) -> None:
        """
        Initialize timeout error.
        
        Args:
            message: Error message
            provider: Provider name (optional)
            timeout_seconds: Timeout duration in seconds (optional)
            details: Additional error details (optional)
        """
        super().__init__(message, provider=provider, details=details)
        self.timeout_seconds = timeout_seconds
        
        # Add timeout to details if provided
        if timeout_seconds is not None:
            self.details["timeout_seconds"] = timeout_seconds
    
    def __str__(self) -> str:
        """String representation of the error."""
        base_msg = super().__str__()
        if self.timeout_seconds:
            return f"{base_msg} (Timeout: {self.timeout_seconds}s)"
        return base_msg


class ProviderValidationError(AIProviderError):
    """Validation error for provider requests or responses.
    
    Raised when request parameters or response data fail validation.
    """
    
    def __init__(self, message: str, field: str | None = None, value: str | None = None, details: dict | None = None) -> None:
        """
        Initialize validation error.
        
        Args:
            message: Error message
            field: Field name that failed validation (optional)
            value: Invalid value (optional)
            details: Additional error details (optional)
        """
        super().__init__(message, details=details)
        self.field = field
        self.value = value
        
        # Add field and value to details if provided
        if field is not None:
            self.details["field"] = field
        if value is not None:
            self.details["value"] = value
    
    def __str__(self) -> str:
        """String representation of the error."""
        base_msg = super().__str__()
        if self.field:
            return f"{base_msg} (Field: {self.field})"
        return base_msg