"""Abstract base class for AI provider clients.

This module defines the provider abstraction layer that enables Chiron to support
multiple AI providers (OpenRouter, OpenAI, Anthropic, etc.) without coupling
the application to a specific provider implementation.
"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class AIProviderClient(ABC):
    """
    Abstract base class for AI provider clients.
    
    This abstraction enables Chiron to support multiple AI providers
    (OpenRouter, OpenAI, Anthropic, etc.) without coupling the application
    to a specific provider implementation.
    
    Implementations must provide:
    - Model listing capabilities
    - Streaming chat completion
    - DSPy language model integration
    - Connection validation for health checks
    """
    
    def __init__(self, api_key: str, **config: Any) -> None:
        """
        Initialize the provider client.
        
        Args:
            api_key: API key for the provider
            **config: Provider-specific configuration
        """
        self.api_key = api_key
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """
        Retrieve list of available models from the provider.
        
        Returns:
            List of model dictionaries with at minimum:
            - id: str - Unique model identifier
            - name: str - Human-readable model name
            
        Raises:
            AIProviderError: If model retrieval fails
        """
        pass
    
    @abstractmethod
    async def stream_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs: Any
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion responses from the provider.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model identifier to use
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
            **kwargs: Provider-specific parameters
            
        Yields:
            String chunks of the completion response
            
        Raises:
            AIProviderError: If streaming fails
            RateLimitExceededError: If rate limit is hit
        """
        pass
    
    @abstractmethod
    def get_dspy_lm(self, model: str) -> Any:
        """
        Get DSPy language model instance for this provider.
        
        This enables DSPy framework integration with different providers.
        Each provider returns the appropriate DSPy LM adapter configured
        for their API.
        
        Args:
            model: Model identifier to configure
            
        Returns:
            DSPy language model instance (e.g., dspy.OpenAI, dspy.Anthropic)
            
        Example:
            For OpenRouter: dspy.OpenAI(model=model, api_base="https://openrouter.ai/api/v1")
            For OpenAI: dspy.OpenAI(model=model)
            For Anthropic: dspy.Anthropic(model=model)
        """
        pass
    
    @abstractmethod
    async def validate_connection(self) -> bool:
        """
        Validate that the provider connection is working.
        
        Used for health checks and API key validation.
        
        Returns:
            True if connection is valid, False otherwise
        """
        pass
    
    def get_provider_name(self) -> str:
        """
        Get the provider name for logging and identification.
        
        Returns:
            Provider name string
        """
        class_name = self.__class__.__name__
        # Remove "Client" suffix if present, then convert to lowercase
        if class_name.endswith("Client"):
            return class_name[:-6].lower()
        return class_name.lower()