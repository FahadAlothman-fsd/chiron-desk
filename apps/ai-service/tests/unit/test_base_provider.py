"""Unit tests for the AI provider abstract base class."""

import pytest
from unittest.mock import Mock
from typing import Any, List, Dict, AsyncGenerator
from app.services.base_provider import AIProviderClient


class TestAIProviderClient:
    """Test cases for AIProviderClient abstract base class."""
    
    def test_cannot_instantiate_abstract_class(self) -> None:
        """Test that AIProviderClient cannot be instantiated directly."""
        with pytest.raises(TypeError) as exc_info:
            AIProviderClient(api_key="test-key")
        
        assert "Can't instantiate abstract class" in str(exc_info.value)
        assert "list_models" in str(exc_info.value)
        assert "stream_chat_completion" in str(exc_info.value)
        assert "get_dspy_lm" in str(exc_info.value)
        assert "validate_connection" in str(exc_info.value)
    
    def test_concrete_implementation_can_be_instantiated(self) -> None:
        """Test that a concrete implementation can be instantiated."""
        
        class ConcreteProvider(AIProviderClient):
            """Concrete implementation for testing."""
            
            async def list_models(self) -> List[Dict[str, Any]]:
                return [{"id": "test-model", "name": "Test Model"}]
            
            async def stream_chat_completion(
                self,
                messages: List[Dict[str, str]],
                model: str,
                temperature: float = 0.7,
                max_tokens: int = 2000,
                **kwargs: Any
            ) -> AsyncGenerator[str, None]:
                yield "test response"
            
            def get_dspy_lm(self, model: str) -> Any:
                return Mock()
            
            async def validate_connection(self) -> bool:
                return True
        
        provider = ConcreteProvider(api_key="test-key", custom_config="value")
        
        assert provider.api_key == "test-key"
        assert provider.config == {"custom_config": "value"}
        assert provider.get_provider_name() == "concreteprovider"
    
    def test_get_provider_name(self) -> None:
        """Test provider name extraction from class name."""
        
        class OpenRouterClient(AIProviderClient):
            async def list_models(self) -> List[Dict[str, Any]]:
                return []
            
            async def stream_chat_completion(
                self,
                messages: List[Dict[str, str]],
                model: str,
                temperature: float = 0.7,
                max_tokens: int = 2000,
                **kwargs: Any
            ) -> AsyncGenerator[str, None]:
                yield ""
            
            def get_dspy_lm(self, model: str) -> Any:
                return Mock()
            
            async def validate_connection(self) -> bool:
                return True
        
        client = OpenRouterClient(api_key="test")
        assert client.get_provider_name() == "openrouter"
    
    def test_logger_initialization(self) -> None:
        """Test that logger is properly initialized with class name."""
        
        class TestProvider(AIProviderClient):
            async def list_models(self) -> List[Dict[str, Any]]:
                return []
            
            async def stream_chat_completion(
                self,
                messages: List[Dict[str, str]],
                model: str,
                temperature: float = 0.7,
                max_tokens: int = 2000,
                **kwargs: Any
            ) -> AsyncGenerator[str, None]:
                yield ""
            
            def get_dspy_lm(self, model: str) -> Any:
                return Mock()
            
            async def validate_connection(self) -> bool:
                return True
        
        provider = TestProvider(api_key="test")
        assert provider.logger.name == "app.services.base_provider.TestProvider"