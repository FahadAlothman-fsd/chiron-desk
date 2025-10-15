"""OpenRouter API client implementation.

This module provides the OpenRouter implementation of the AIProviderClient
interface, enabling access to OpenRouter's AI model API with proper
authentication, error handling, and rate limiting.
"""

import json
import logging
from typing import Any, List, Dict, AsyncGenerator, Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .base_provider import AIProviderClient

logger = logging.getLogger(__name__)


class OpenRouterClient(AIProviderClient):
    """
    OpenRouter API client implementation.
    
    Provides access to OpenRouter's AI model API with streaming chat completion,
    model listing, and DSPy integration capabilities.
    """
    
    def __init__(self, api_key: str, **config: Any) -> None:
        """
        Initialize OpenRouter client.
        
        Args:
            api_key: OpenRouter API key
            **config: Additional configuration including:
                - base_url: OpenRouter API base URL (default: https://openrouter.ai/api/v1)
                - timeout: Request timeout in seconds (default: 30)
                - connect_timeout: Connection timeout in seconds (default: 10)
                - max_connections: Maximum connection pool size (default: 100)
                - max_keepalive_connections: Maximum keepalive connections (default: 20)
                - http_referer: HTTP referer header (default: https://chiron.local)
                - app_title: X-Title header (default: Chiron)
        """
        super().__init__(api_key, **config)
        
        self.base_url = config.get("base_url", "https://openrouter.ai/api/v1")
        self.timeout = config.get("timeout", 30.0)
        self.connect_timeout = config.get("connect_timeout", 10.0)
        self.max_connections = config.get("max_connections", 100)
        self.max_keepalive_connections = config.get("max_keepalive_connections", 20)
        self.http_referer = config.get("http_referer", "https://chiron.local")
        self.app_title = config.get("app_title", "Chiron")
        
        # Initialize HTTP client with proper configuration
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(
                connect=self.connect_timeout,
                read=self.timeout,
                write=self.timeout,
                pool=self.timeout
            ),
            limits=httpx.Limits(
                max_connections=self.max_connections,
                max_keepalive_connections=self.max_keepalive_connections
            ),
            headers=self._get_default_headers()
        )
        
        self.logger.info(f"Initialized OpenRouter client with base URL: {self.base_url}")
    
    def _get_default_headers(self) -> Dict[str, str]:
        """
        Get default headers for OpenRouter API requests.
        
        Returns:
            Dictionary of default headers
        """
        return {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": self.http_referer,
            "X-Title": self.app_title,
            "Content-Type": "application/json",
            "User-Agent": "Chiron/1.0"
        }
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def list_models(self) -> List[Dict[str, Any]]:
        """
        Retrieve list of available models from OpenRouter.
        
        Returns:
            List of model dictionaries with model information
            
        Raises:
            OpenRouterAPIError: If model retrieval fails
            ProviderAuthenticationError: If authentication fails
            RateLimitExceededError: If rate limit is exceeded
            ProviderConnectionError: If connection fails
            ProviderTimeoutError: If request times out
        """
        from .exceptions import (
            OpenRouterAPIError,
            ProviderAuthenticationError,
            RateLimitExceededError,
            ProviderConnectionError,
            ProviderTimeoutError
        )
        
        self.logger.info("Fetching available models from OpenRouter")
        
        try:
            response = await self._client.get("/models")
            response.raise_for_status()
            
            data = response.json()
            
            # Validate response structure
            if "data" not in data:
                raise OpenRouterAPIError(
                    "Invalid response format: missing 'data' field",
                    status_code=response.status_code,
                    details={"response_keys": list(data.keys())}
                )
            
            models = data["data"]
            
            if not isinstance(models, list):
                raise OpenRouterAPIError(
                    "Invalid response format: 'data' field is not a list",
                    status_code=response.status_code,
                    details={"data_type": type(models).__name__}
                )
            
            self.logger.info(f"Successfully retrieved {len(models)} models from OpenRouter")
            return models
            
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_text = e.response.text
            
            if status_code == 401:
                self.logger.error("Authentication failed: Invalid API key")
                raise ProviderAuthenticationError(
                    "Invalid OpenRouter API key",
                    provider="openrouter",
                    details={"status_code": status_code, "response": error_text[:200]}
                )
            elif status_code == 429:
                self.logger.error("Rate limit exceeded while fetching models")
                retry_after = e.response.headers.get("Retry-After")
                raise RateLimitExceededError(
                    "OpenRouter rate limit exceeded while fetching models",
                    retry_after=int(retry_after) if retry_after else None,
                    details={"status_code": status_code, "response": error_text[:200]}
                )
            elif status_code >= 500:
                self.logger.error(f"OpenRouter server error: {status_code}")
                raise OpenRouterAPIError(
                    f"OpenRouter server error: {status_code}",
                    status_code=status_code,
                    details={"response": error_text[:200]}
                )
            else:
                self.logger.error(f"HTTP error fetching models: {status_code} - {error_text}")
                raise OpenRouterAPIError(
                    f"HTTP error fetching models: {status_code}",
                    status_code=status_code,
                    details={"response": error_text[:200]}
                )
                
        except httpx.TimeoutException as e:
            self.logger.error(f"Timeout fetching models: {str(e)}")
            raise ProviderTimeoutError(
                "Request timeout while fetching models from OpenRouter",
                provider="openrouter",
                timeout_seconds=self.timeout,
                details={"timeout": self.timeout}
            )
            
        except httpx.ConnectError as e:
            self.logger.error(f"Connection error fetching models: {str(e)}")
            raise ProviderConnectionError(
                "Failed to connect to OpenRouter API",
                provider="openrouter",
                details={"error": str(e)}
            )
            
        except httpx.RequestError as e:
            self.logger.error(f"Request error fetching models: {str(e)}")
            raise ProviderConnectionError(
                f"Network error while fetching models: {str(e)}",
                provider="openrouter",
                details={"error": str(e)}
            )
            
        except json.JSONDecodeError as e:
            self.logger.error(f"JSON decode error fetching models: {str(e)}")
            # Note: response might not be available in JSON decode error
            raise OpenRouterAPIError(
                "Invalid JSON response from OpenRouter",
                details={"json_error": str(e)}
            )
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def stream_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs: Any
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion responses from OpenRouter.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model identifier to use
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional parameters for OpenRouter API
            
        Yields:
            String chunks of the completion response
            
        Raises:
            Exception: If streaming fails
        """
        self.logger.info(f"Starting chat completion with model: {model}")
        
        request_data = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
            **kwargs
        }
        
        try:
            async with self._client.stream(
                "POST",
                "/chat/completions",
                json=request_data
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.strip():
                        if line.startswith("data: "):
                            data_str = line[6:]  # Remove "data: " prefix
                            
                            if data_str == "[DONE]":
                                self.logger.info("Stream completed")
                                break
                            
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and data["choices"]:
                                    delta = data["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        content = delta["content"]
                                        if content:
                                            yield content
                            except json.JSONDecodeError:
                                self.logger.warning(f"Failed to parse SSE data: {data_str}")
                                
        except httpx.HTTPStatusError as e:
            self.logger.error(f"HTTP error in chat completion: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            self.logger.error(f"Request error in chat completion: {str(e)}")
            raise
    
    def get_dspy_lm(self, model: str) -> Any:
        """
        Get DSPy language model instance for OpenRouter.
        
        Args:
            model: Model identifier to configure
            
        Returns:
            DSPy OpenAI language model configured for OpenRouter
        """
        try:
            import dspy
        except ImportError:
            raise ImportError("DSPy is not installed. Install with: pip install dspy-ai")
        
        self.logger.info(f"Creating DSPy LM for model: {model}")
        
        return dspy.OpenAI(
            model=model,
            api_key=self.api_key,
            api_base=self.base_url,
            default_headers={
                "HTTP-Referer": self.http_referer,
                "X-Title": self.app_title
            }
        )
    
    async def validate_connection(self) -> bool:
        """
        Validate that the OpenRouter connection is working.
        
        Returns:
            True if connection is valid, False otherwise
        """
        try:
            self.logger.info("Validating OpenRouter connection")
            
            # Try to fetch models as a simple connection test
            await self.list_models()
            
            self.logger.info("OpenRouter connection validation successful")
            return True
            
        except Exception as e:
            self.logger.error(f"OpenRouter connection validation failed: {str(e)}")
            return False
    
    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()
        self.logger.info("OpenRouter client closed")
    
    async def __aenter__(self) -> "OpenRouterClient":
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        await self.close()