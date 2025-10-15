"""Unit tests for configuration management."""

import os
import pytest
from unittest.mock import patch, MagicMock
from pydantic import ValidationError

from app.config import (
    AIServiceConfig,
    get_config,
    reload_config,
    get_provider_config,
    get_rate_limit_config,
    get_logging_config,
)


class TestAIServiceConfig:
    """Test cases for AIServiceConfig."""

    def test_default_configuration(self):
        """Test default configuration values."""
        config = AIServiceConfig()
        
        assert config.ai_provider == "openrouter"
        assert config.openrouter_base_url == "https://openrouter.ai/api/v1"
        assert config.default_timeout == 30.0
        assert config.connect_timeout == 10.0
        assert config.max_connections == 100
        assert config.rate_limit_requests == 60
        assert config.rate_limit_window == 60
        assert config.app_name == "Chiron"
        assert config.log_level == "INFO"
        assert config.log_format == "json"
        assert config.retry_attempts == 3

    def test_environment_variable_loading(self):
        """Test loading configuration from environment variables."""
        env_vars = {
            "AI_PROVIDER": "openrouter",
            "OPENROUTER_API_KEY": "test-key",
            "DEFAULT_TIMEOUT": "45.0",
            "LOG_LEVEL": "DEBUG",
            "RATE_LIMIT_REQUESTS": "120",
        }
        
        with patch.dict(os.environ, env_vars):
            config = AIServiceConfig()
            
            assert config.ai_provider == "openrouter"
            assert config.openrouter_api_key == "test-key"
            assert config.default_timeout == 45.0
            assert config.log_level == "DEBUG"
            assert config.rate_limit_requests == 120

    def test_invalid_ai_provider(self):
        """Test validation of unsupported AI provider."""
        with patch.dict(os.environ, {"AI_PROVIDER": "invalid_provider"}):
            with pytest.raises(ValidationError) as exc_info:
                AIServiceConfig()
            
            assert "Unsupported AI provider" in str(exc_info.value)

    def test_invalid_log_level(self):
        """Test validation of invalid log level."""
        with patch.dict(os.environ, {"LOG_LEVEL": "INVALID"}):
            with pytest.raises(ValidationError) as exc_info:
                AIServiceConfig()
            
            assert "Invalid log level" in str(exc_info.value)

    def test_invalid_log_format(self):
        """Test validation of invalid log format."""
        with patch.dict(os.environ, {"LOG_FORMAT": "xml"}):
            with pytest.raises(ValidationError) as exc_info:
                AIServiceConfig()
            
            assert "Invalid log format" in str(exc_info.value)

    def test_invalid_timeout_values(self):
        """Test validation of timeout values."""
        with patch.dict(os.environ, {"DEFAULT_TIMEOUT": "-5"}):
            with pytest.raises(ValidationError) as exc_info:
                AIServiceConfig()
            
            assert "Timeout values must be positive" in str(exc_info.value)

    def test_invalid_retry_attempts(self):
        """Test validation of retry attempts."""
        with patch.dict(os.environ, {"RETRY_ATTEMPTS": "-1"}):
            with pytest.raises(ValidationError) as exc_info:
                AIServiceConfig()
            
            assert "Retry attempts must be non-negative" in str(exc_info.value)

    def test_get_provider_config_openrouter(self):
        """Test getting OpenRouter provider configuration."""
        config = AIServiceConfig(
            openrouter_api_key="test-key",
            app_name="TestApp"
        )
        
        provider_config = config.get_provider_config("openrouter")
        
        assert provider_config["api_key"] == "test-key"
        assert provider_config["base_url"] == "https://openrouter.ai/api/v1"
        assert provider_config["timeout"] == 30.0
        assert provider_config["connect_timeout"] == 10.0
        assert provider_config["http_referer"] == "https://chiron.local"
        assert provider_config["app_title"] == "TestApp"

    def test_get_provider_config_unsupported(self):
        """Test getting configuration for unsupported provider."""
        config = AIServiceConfig()
        
        with pytest.raises(ValueError) as exc_info:
            config.get_provider_config("unsupported")
        
        assert "Unsupported provider" in str(exc_info.value)

    def test_get_rate_limit_config(self):
        """Test getting rate limiting configuration."""
        config = AIServiceConfig(
            rate_limit_requests=100,
            rate_limit_window=120,
            rate_limit_burst=150
        )
        
        rate_config = config.get_rate_limit_config()
        
        assert rate_config["max_requests"] == 100
        assert rate_config["time_window_seconds"] == 120
        assert rate_config["burst_capacity"] == 150

    def test_get_rate_limit_config_default_burst(self):
        """Test rate limiting config with default burst capacity."""
        config = AIServiceConfig(rate_limit_requests=80, rate_limit_burst=None)
        
        rate_config = config.get_rate_limit_config()
        
        assert rate_config["burst_capacity"] == 80

    def test_validate_provider_api_key_openrouter(self):
        """Test API key validation for OpenRouter."""
        config = AIServiceConfig(openrouter_api_key="test-key")
        assert config.validate_provider_api_key("openrouter") is True
        
        config_no_key = AIServiceConfig(openrouter_api_key=None)
        assert config_no_key.validate_provider_api_key("openrouter") is False

    def test_validate_provider_api_key_unsupported(self):
        """Test API key validation for unsupported provider."""
        config = AIServiceConfig()
        assert config.validate_provider_api_key("unsupported") is False

    def test_get_logging_config(self):
        """Test getting logging configuration."""
        config = AIServiceConfig(log_level="DEBUG", log_format="text")
        
        logging_config = config.get_logging_config()
        
        assert logging_config["level"] == "DEBUG"
        assert logging_config["format"] == "text"
        assert logging_config["service_name"] == "ai-service"

    @patch('app.config.logger')
    def test_validate_configuration_success(self, mock_logger):
        """Test successful configuration validation."""
        config = AIServiceConfig(openrouter_api_key="test-key")
        
        # Should not raise an exception
        config.validate_configuration()
        
        # Check that info log was called
        mock_logger.info.assert_called_once()

    @patch('app.config.logger')
    def test_validate_configuration_missing_api_key(self, mock_logger):
        """Test configuration validation with missing API key."""
        config = AIServiceConfig(openrouter_api_key=None)
        
        with pytest.raises(ValueError) as exc_info:
            config.validate_configuration()
        
        assert "API key is required" in str(exc_info.value)
        assert "OPENROUTER_API_KEY" in str(exc_info.value)


class TestConfigurationFunctions:
    """Test cases for configuration module functions."""

    @patch('app.config.AIServiceConfig')
    def test_get_config_singleton(self, mock_config_class):
        """Test that get_config returns singleton instance."""
        mock_instance = MagicMock()
        mock_config_class.return_value = mock_instance
        
        # First call should create instance
        result1 = get_config()
        mock_config_class.assert_called_once()
        mock_instance.validate_configuration.assert_called_once()
        
        # Second call should return same instance
        result2 = get_config()
        mock_config_class.assert_called_once()  # Still only called once
        
        assert result1 is result2

    @patch('app.config.AIServiceConfig')
    @patch('app.config.logger')
    def test_reload_config(self, mock_logger, mock_config_class):
        """Test configuration reload."""
        mock_instance = MagicMock()
        mock_config_class.return_value = mock_instance
        
        result = reload_config()
        
        mock_config_class.assert_called_once()
        mock_instance.validate_configuration.assert_called_once()
        mock_logger.info.assert_called_once_with("Configuration reloaded")
        assert result is mock_instance

    @patch('app.config.get_config')
    def test_get_provider_config_function(self, mock_get_config):
        """Test get_provider_config function."""
        mock_config = MagicMock()
        mock_config.get_provider_config.return_value = {"test": "config"}
        mock_get_config.return_value = mock_config
        
        result = get_provider_config("openrouter")
        
        mock_config.get_provider_config.assert_called_once_with("openrouter")
        assert result == {"test": "config"}

    @patch('app.config.get_config')
    def test_get_rate_limit_config_function(self, mock_get_config):
        """Test get_rate_limit_config function."""
        mock_config = MagicMock()
        mock_config.get_rate_limit_config.return_value = {"rate": "config"}
        mock_get_config.return_value = mock_config
        
        result = get_rate_limit_config()
        
        mock_config.get_rate_limit_config.assert_called_once()
        assert result == {"rate": "config"}

    @patch('app.config.get_config')
    def test_get_logging_config_function(self, mock_get_config):
        """Test get_logging_config function."""
        mock_config = MagicMock()
        mock_config.get_logging_config.return_value = {"logging": "config"}
        mock_get_config.return_value = mock_config
        
        result = get_logging_config()
        
        mock_config.get_logging_config.assert_called_once()
        assert result == {"logging": "config"}

    @patch.dict(os.environ, {
        "OPENROUTER_API_KEY": "env-test-key",
        "AI_PROVIDER": "openrouter",
        "DEFAULT_TIMEOUT": "60",
        "LOG_LEVEL": "WARNING"
    })
    def test_end_to_end_configuration(self):
        """Test end-to-end configuration loading with environment variables."""
        # Clear any cached config
        import app.config
        app.config._config = None
        
        config = get_config()
        
        assert config.openrouter_api_key == "env-test-key"
        assert config.ai_provider == "openrouter"
        assert config.default_timeout == 60.0
        assert config.log_level == "WARNING"
        
        # Test provider config
        provider_config = get_provider_config("openrouter")
        assert provider_config["api_key"] == "env-test-key"
        assert provider_config["timeout"] == 60.0
        
        # Test rate limit config
        rate_config = get_rate_limit_config()
        assert rate_config["max_requests"] == 60
        
        # Test logging config
        logging_config = get_logging_config()
        assert logging_config["level"] == "WARNING"