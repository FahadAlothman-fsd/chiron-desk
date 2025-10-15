"""Unit tests for provider factory."""

import pytest
from unittest.mock import Mock

from app.services.provider_factory import ProviderFactory
from app.services.base_provider import AIProviderClient


class TestProviderFactory:
    """Test cases for ProviderFactory."""
    
    def test_get_supported_providers(self) -> None:
        """Test getting list of supported providers."""
        providers = ProviderFactory.get_supported_providers()
        
        assert "openrouter" in providers
        assert isinstance(providers, list)
    
    def test_get_default_provider(self) -> None:
        """Test getting default provider."""
        default = ProviderFactory.get_default_provider()
        assert default == "openrouter"
    
    def test_is_provider_supported(self) -> None:
        """Test checking if provider is supported."""
        assert ProviderFactory.is_provider_supported("openrouter") is True
        assert ProviderFactory.is_provider_supported("openai") is False
        assert ProviderFactory.is_provider_supported("invalid") is False
    
    def test_create_provider_success(self) -> None:
        """Test successful provider creation."""
        provider = ProviderFactory.create_provider(
            "openrouter", 
            "test-api-key",
            timeout=10.0
        )
        
        assert provider is not None
        assert provider.api_key == "test-api-key"
        assert provider.timeout == 10.0
        assert provider.get_provider_name() == "openrouter"
    
    def test_create_provider_unsupported(self) -> None:
        """Test provider creation with unsupported type."""
        with pytest.raises(ValueError) as exc_info:
            ProviderFactory.create_provider("unsupported", "test-key")
        
        assert "Unsupported provider: unsupported" in str(exc_info.value)
        assert "openrouter" in str(exc_info.value)
    
    def test_create_provider_without_api_key(self) -> None:
        """Test provider creation without API key should still work."""
        # The factory doesn't validate API key format, just passes it through
        provider = ProviderFactory.create_provider("openrouter", "")
        
        assert provider is not None
        assert provider.api_key == ""
    
    def test_register_provider_success(self) -> None:
        """Test successful provider registration."""
        
        class MockProvider(AIProviderClient):
            async def list_models(self) -> list[dict[str, any]]:
                return []
            
            async def stream_chat_completion(
                self,
                messages: list[dict[str, str]],
                model: str,
                temperature: float = 0.7,
                max_tokens: int = 2000,
                **kwargs: any
            ) -> any:
                yield ""
            
            def get_dspy_lm(self, model: str) -> any:
                return Mock()
            
            async def validate_connection(self) -> bool:
                return True
        
        # Register new provider
        ProviderFactory.register_provider("mock", MockProvider)
        
        # Verify it's supported
        assert ProviderFactory.is_provider_supported("mock") is True
        assert "mock" in ProviderFactory.get_supported_providers()
        
        # Test creating instance
        provider = ProviderFactory.create_provider("mock", "test-key")
        assert isinstance(provider, MockProvider)
        
        # Clean up
        ProviderFactory.unregister_provider("mock")
    
    def test_register_provider_invalid_class(self) -> None:
        """Test provider registration with invalid class."""
        
        class InvalidClass:
            pass
        
        with pytest.raises(TypeError) as exc_info:
            ProviderFactory.register_provider("invalid", InvalidClass)
        
        assert "must inherit from AIProviderClient" in str(exc_info.value)
    
    def test_unregister_provider_success(self) -> None:
        """Test successful provider unregistration."""
        
        class TempProvider(AIProviderClient):
            async def list_models(self) -> list[dict[str, any]]:
                return []
            
            async def stream_chat_completion(
                self,
                messages: list[dict[str, str]],
                model: str,
                temperature: float = 0.7,
                max_tokens: int = 2000,
                **kwargs: any
            ) -> any:
                yield ""
            
            def get_dspy_lm(self, model: str) -> any:
                return Mock()
            
            async def validate_connection(self) -> bool:
                return True
        
        # Register and then unregister
        ProviderFactory.register_provider("temp", TempProvider)
        assert ProviderFactory.is_provider_supported("temp") is True
        
        ProviderFactory.unregister_provider("temp")
        assert ProviderFactory.is_provider_supported("temp") is False
    
    def test_unregister_provider_not_registered(self) -> None:
        """Test unregistering a provider that isn't registered."""
        with pytest.raises(ValueError) as exc_info:
            ProviderFactory.unregister_provider("nonexistent")
        
        assert "is not registered" in str(exc_info.value)
    
    def test_unregister_default_provider(self) -> None:
        """Test that default provider cannot be unregistered."""
        with pytest.raises(ValueError) as exc_info:
            ProviderFactory.unregister_provider("openrouter")
        
        assert "Cannot unregister default provider" in str(exc_info.value)
    
    def test_set_default_provider_success(self) -> None:
        """Test successfully setting default provider."""
        
        class TempProvider(AIProviderClient):
            async def list_models(self) -> list[dict[str, any]]:
                return []
            
            async def stream_chat_completion(
                self,
                messages: list[dict[str, str]],
                model: str,
                temperature: float = 0.7,
                max_tokens: int = 2000,
                **kwargs: any
            ) -> any:
                yield ""
            
            def get_dspy_lm(self, model: str) -> any:
                return Mock()
            
            async def validate_connection(self) -> bool:
                return True
        
        # Register temp provider and set as default
        ProviderFactory.register_provider("temp", TempProvider)
        original_default = ProviderFactory.get_default_provider()
        
        ProviderFactory.set_default_provider("temp")
        assert ProviderFactory.get_default_provider() == "temp"
        
        # Restore original default
        ProviderFactory.set_default_provider(original_default)
        ProviderFactory.unregister_provider("temp")
    
    def test_set_default_provider_unsupported(self) -> None:
        """Test setting default to unsupported provider."""
        with pytest.raises(ValueError) as exc_info:
            ProviderFactory.set_default_provider("unsupported")
        
        assert "Cannot set unsupported provider as default" in str(exc_info.value)
    
    def test_create_provider_with_config(self) -> None:
        """Test creating provider with custom configuration."""
        config = {
            "timeout": 60.0,
            "connect_timeout": 15.0,
            "max_connections": 200,
            "http_referer": "https://custom.local",
            "app_title": "CustomApp"
        }
        
        provider = ProviderFactory.create_provider(
            "openrouter",
            "test-key",
            **config
        )
        
        assert provider.timeout == 60.0
        assert provider.connect_timeout == 15.0
        assert provider.max_connections == 200
        assert provider.http_referer == "https://custom.local"
        assert provider.app_title == "CustomApp"