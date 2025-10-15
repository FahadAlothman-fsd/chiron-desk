"""Configuration management for AI service.

This module provides centralized configuration management with support for
environment variables, validation, and multi-provider configuration.
"""

import os
import logging
from typing import Optional, Dict, Any
from pydantic import Field, validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class AIServiceConfig(BaseSettings):
    """
    Configuration settings for the AI service.
    
    Uses Pydantic BaseSettings for automatic environment variable loading
    and validation.
    """
    
    # Provider Configuration
    ai_provider: str = Field(default="openrouter", description="AI provider to use")
    openrouter_api_key: Optional[str] = Field(default=None, description="OpenRouter API key")
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        description="OpenRouter API base URL"
    )
    
    # Future provider configurations (for extensibility)
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic API key")
    
    # Request Configuration
    default_timeout: float = Field(default=30.0, description="Default request timeout in seconds")
    connect_timeout: float = Field(default=10.0, description="Connection timeout in seconds")
    max_connections: int = Field(default=100, description="Maximum connection pool size")
    max_keepalive_connections: int = Field(default=20, description="Maximum keepalive connections")
    
    # Rate Limiting Configuration
    rate_limit_requests: int = Field(default=60, description="Rate limit: requests per minute")
    rate_limit_window: int = Field(default=60, description="Rate limit: time window in seconds")
    rate_limit_burst: Optional[int] = Field(default=None, description="Rate limit: burst capacity")
    
    # Application Configuration
    app_name: str = Field(default="Chiron", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    http_referer: str = Field(default="https://chiron.local", description="HTTP referer header")
    
    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="json", description="Log format (json or text)")
    
    # Retry Configuration
    retry_attempts: int = Field(default=3, description="Number of retry attempts")
    retry_min_wait: float = Field(default=4.0, description="Minimum retry wait time in seconds")
    retry_max_wait: float = Field(default=10.0, description="Maximum retry wait time in seconds")
    
    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
        # Environment variable prefixes
        env_prefix = ""
        
        # Allow extra fields for future extensibility
        extra = "ignore"
    
    @validator("ai_provider")
    def validate_ai_provider(cls, v: str) -> str:
        """Validate AI provider."""
        supported_providers = ["openrouter"]  # Add more as they are implemented
        if v not in supported_providers:
            raise ValueError(
                f"Unsupported AI provider: {v}. "
                f"Supported providers: {', '.join(supported_providers)}"
            )
        return v.lower()
    
    @validator("log_level")
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(
                f"Invalid log level: {v}. "
                f"Valid levels: {', '.join(valid_levels)}"
            )
        return v.upper()
    
    @validator("log_format")
    def validate_log_format(cls, v: str) -> str:
        """Validate log format."""
        valid_formats = ["json", "text"]
        if v.lower() not in valid_formats:
            raise ValueError(
                f"Invalid log format: {v}. "
                f"Valid formats: {', '.join(valid_formats)}"
            )
        return v.lower()
    
    @validator("default_timeout", "connect_timeout")
    def validate_timeouts(cls, v: float) -> float:
        """Validate timeout values."""
        if v <= 0:
            raise ValueError("Timeout values must be positive")
        return v
    
    @validator("max_connections", "max_keepalive_connections", "rate_limit_requests", "rate_limit_window")
    def validate_positive_ints(cls, v: int) -> int:
        """Validate positive integer values."""
        if v <= 0:
            raise ValueError("Value must be positive")
        return v
    
    @validator("retry_attempts")
    def validate_retry_attempts(cls, v: int) -> int:
        """Validate retry attempts."""
        if v < 0:
            raise ValueError("Retry attempts must be non-negative")
        return v
    
    def get_provider_config(self, provider: str) -> Dict[str, Any]:
        """
        Get provider-specific configuration.
        
        Args:
            provider: Provider name
            
        Returns:
            Dictionary with provider configuration
            
        Raises:
            ValueError: If provider is not supported
        """
        if provider == "openrouter":
            return {
                "api_key": self.openrouter_api_key,
                "base_url": self.openrouter_base_url,
                "timeout": self.default_timeout,
                "connect_timeout": self.connect_timeout,
                "max_connections": self.max_connections,
                "max_keepalive_connections": self.max_keepalive_connections,
                "http_referer": self.http_referer,
                "app_title": self.app_name,
                "retry_attempts": self.retry_attempts,
                "retry_min_wait": self.retry_min_wait,
                "retry_max_wait": self.retry_max_wait,
            }
        elif provider == "openai":
            return {
                "api_key": self.openai_api_key,
                "timeout": self.default_timeout,
                "connect_timeout": self.connect_timeout,
                "max_connections": self.max_connections,
                "max_keepalive_connections": self.max_keepalive_connections,
                "app_title": self.app_name,
            }
        elif provider == "anthropic":
            return {
                "api_key": self.anthropic_api_key,
                "timeout": self.default_timeout,
                "connect_timeout": self.connect_timeout,
                "max_connections": self.max_connections,
                "max_keepalive_connections": self.max_keepalive_connections,
                "app_title": self.app_name,
            }
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    def get_rate_limit_config(self) -> Dict[str, Any]:
        """
        Get rate limiting configuration.
        
        Returns:
            Dictionary with rate limiting configuration
        """
        return {
            "max_requests": self.rate_limit_requests,
            "time_window_seconds": self.rate_limit_window,
            "burst_capacity": self.rate_limit_burst or self.rate_limit_requests,
        }
    
    def validate_provider_api_key(self, provider: str) -> bool:
        """
        Validate that the required API key is present for a provider.
        
        Args:
            provider: Provider name
            
        Returns:
            True if API key is present, False otherwise
        """
        if provider == "openrouter":
            return bool(self.openrouter_api_key)
        elif provider == "openai":
            return bool(self.openai_api_key)
        elif provider == "anthropic":
            return bool(self.anthropic_api_key)
        else:
            return False
    
    def get_logging_config(self) -> Dict[str, Any]:
        """
        Get logging configuration.
        
        Returns:
            Dictionary with logging configuration
        """
        return {
            "level": self.log_level,
            "format": self.log_format,
            "service_name": "ai-service",
        }
    
    def validate_configuration(self) -> None:
        """
        Validate the complete configuration.
        
        Raises:
            ValueError: If configuration is invalid
        """
        # Validate provider API key
        if not self.validate_provider_api_key(self.ai_provider):
            raise ValueError(
                f"API key is required for provider: {self.ai_provider}. "
                f"Set the {self.ai_provider.upper()}_API_KEY environment variable."
            )
        
        # Log configuration summary (without sensitive data)
        logger.info(
            f"Configuration validated - Provider: {self.ai_provider}, "
            f"Timeout: {self.default_timeout}s, "
            f"Rate Limit: {self.rate_limit_requests}/{self.rate_limit_window}s"
        )


# Global configuration instance
_config: Optional[AIServiceConfig] = None


def get_config() -> AIServiceConfig:
    """
    Get the global configuration instance.
    
    Returns:
        AIServiceConfig instance
    """
    global _config
    if _config is None:
        _config = AIServiceConfig()
        _config.validate_configuration()
    return _config


def reload_config() -> AIServiceConfig:
    """
    Reload the configuration from environment variables.
    
    Returns:
        New AIServiceConfig instance
    """
    global _config
    _config = AIServiceConfig()
    _config.validate_configuration()
    logger.info("Configuration reloaded")
    return _config


def get_provider_config(provider: str) -> Dict[str, Any]:
    """
    Get provider-specific configuration.
    
    Args:
        provider: Provider name
        
    Returns:
        Dictionary with provider configuration
    """
    return get_config().get_provider_config(provider)


def get_rate_limit_config() -> Dict[str, Any]:
    """
    Get rate limiting configuration.
    
    Returns:
        Dictionary with rate limiting configuration
    """
    return get_config().get_rate_limit_config()


def get_logging_config() -> Dict[str, Any]:
    """
    Get logging configuration.
    
    Returns:
        Dictionary with logging configuration
    """
    return get_config().get_logging_config()