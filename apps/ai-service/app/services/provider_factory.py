"""Provider factory for creating AI provider client instances.

This module implements the factory pattern for creating AI provider clients,
enabling easy addition of new providers and decoupling the application
from specific provider implementations.
"""

from typing import Dict, Type, Any, List, Optional
import logging
import os

from .base_provider import AIProviderClient
from .openrouter_client import OpenRouterClient
from ..config import get_config

logger = logging.getLogger(__name__)


class ProviderFactory:
    """
    Factory for creating AI provider client instances.
    
    This factory implements the Factory pattern to create provider instances
    based on provider type identifiers. It supports easy registration of new
    providers and provides helpful error messages for unsupported providers.
    """
    
    _providers: Dict[str, Type[AIProviderClient]] = {
        "openrouter": OpenRouterClient,
        # Future providers can be registered here:
        # "openai": OpenAIClient,
        # "anthropic": AnthropicClient,
    }
    
    _default_provider = "openrouter"
    
    @classmethod
    def create_provider(
        cls, 
        provider_type: str, 
        api_key: str, 
        **config: Any
    ) -> AIProviderClient:
        """
        Create a provider client instance.
        
        Args:
            provider_type: Provider identifier ("openrouter", "openai", etc.)
            api_key: API key for the provider
            **config: Provider-specific configuration
            
        Returns:
            Configured AIProviderClient instance
            
        Raises:
            ValueError: If provider_type is not supported
        """
        if provider_type not in cls._providers:
            supported = ", ".join(cls._providers.keys())
            error_msg = (
                f"Unsupported provider: {provider_type}. "
                f"Supported providers: {supported}"
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        provider_class = cls._providers[provider_type]
        logger.info(f"Creating provider instance for: {provider_type}")
        
        try:
            provider_instance = provider_class(api_key=api_key, **config)
            logger.info(f"Successfully created {provider_type} provider instance")
            return provider_instance
        except Exception as e:
            logger.error(f"Failed to create {provider_type} provider: {str(e)}")
            raise
    
    @classmethod
    def get_supported_providers(cls) -> List[str]:
        """
        Get list of supported provider types.
        
        Returns:
            List of supported provider identifiers
        """
        return list(cls._providers.keys())
    
    @classmethod
    def get_default_provider(cls) -> str:
        """
        Get the default provider type.
        
        Returns:
            Default provider identifier
        """
        return cls._default_provider
    
    @classmethod
    def is_provider_supported(cls, provider_type: str) -> bool:
        """
        Check if a provider type is supported.
        
        Args:
            provider_type: Provider identifier to check
            
        Returns:
            True if provider is supported, False otherwise
        """
        return provider_type in cls._providers
    
    @classmethod
    def register_provider(
        cls, 
        provider_type: str, 
        provider_class: Type[AIProviderClient]
    ) -> None:
        """
        Register a new provider type.
        
        This method allows dynamic registration of new provider types,
        enabling plugins or extensions to add support for new AI providers.
        
        Args:
            provider_type: Provider identifier
            provider_class: Provider class that implements AIProviderClient
            
        Raises:
            TypeError: If provider_class doesn't inherit from AIProviderClient
        """
        if not issubclass(provider_class, AIProviderClient):
            raise TypeError(
                f"Provider class must inherit from AIProviderClient. "
                f"Got: {provider_class.__name__}"
            )
        
        cls._providers[provider_type] = provider_class
        logger.info(f"Registered new provider: {provider_type} -> {provider_class.__name__}")
    
    @classmethod
    def unregister_provider(cls, provider_type: str) -> None:
        """
        Unregister a provider type.
        
        Args:
            provider_type: Provider identifier to remove
            
        Raises:
            ValueError: If provider_type is not registered
        """
        if provider_type not in cls._providers:
            raise ValueError(f"Provider {provider_type} is not registered")
        
        if provider_type == cls._default_provider:
            raise ValueError(f"Cannot unregister default provider: {provider_type}")
        
        del cls._providers[provider_type]
        logger.info(f"Unregistered provider: {provider_type}")
    
    @classmethod
    def get_provider(cls) -> AIProviderClient:
        """
        Get the default provider instance.
        
        Creates and returns a provider instance using the default configuration.
        This is a convenience method that uses environment configuration.
        
        Returns:
            Configured AIProviderClient instance
            
        Raises:
            ValueError: If provider configuration is invalid
            Exception: If provider creation fails
        """
        try:
            config = get_config()
            provider_type = config.provider_type
            api_key = config.get_api_key()
            
            if not api_key:
                raise ValueError(f"No API key configured for provider: {provider_type}")
            
            return cls.create_provider(
                provider_type=provider_type,
                api_key=api_key,
                base_url=config.base_url
            )
        except Exception as e:
            logger.error(f"Failed to get provider instance: {str(e)}")
            raise
    
    @classmethod
    def set_default_provider(cls, provider_type: str) -> None:
        """
        Set the default provider type.
        
        Args:
            provider_type: Provider identifier to set as default
            
        Raises:
            ValueError: If provider_type is not supported
        """
        if not cls.is_provider_supported(provider_type):
            supported = ", ".join(cls._providers.keys())
            raise ValueError(
                f"Cannot set unsupported provider as default: {provider_type}. "
                f"Supported providers: {supported}"
            )
        
        old_default = cls._default_provider
        cls._default_provider = provider_type
        logger.info(f"Changed default provider from {old_default} to {provider_type}")