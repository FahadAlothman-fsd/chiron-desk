"""Rate limiting implementation using token bucket algorithm.

This module provides a provider-agnostic rate limiter that can be used
to control the rate of API requests to any provider, preventing
rate limit exceeded errors and ensuring fair usage.
"""

import time
import asyncio
import logging
from typing import Optional

from .exceptions import RateLimitExceededError

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Rate limiter implementation using the token bucket algorithm.
    
    This rate limiter is provider-agnostic and can be used to control
    the rate of API requests to prevent hitting provider rate limits.
    It uses the token bucket algorithm which allows for bursts while
    maintaining a long-term average rate.
    """
    
    def __init__(
        self, 
        max_requests: int = 60, 
        time_window_seconds: int = 60,
        burst_capacity: Optional[int] = None
    ) -> None:
        """
        Initialize rate limiter.
        
        Args:
            max_requests: Maximum number of requests allowed in the time window
            time_window_seconds: Time window in seconds
            burst_capacity: Maximum burst capacity (defaults to max_requests)
        """
        self.max_requests = max_requests
        self.time_window_seconds = time_window_seconds
        self.burst_capacity = burst_capacity or max_requests
        
        # Token bucket state
        self.tokens = self.burst_capacity
        self.last_refill_time = time.time()
        self._lock = asyncio.Lock()
        
        logger.info(
            f"Initialized rate limiter: {max_requests} requests per "
            f"{time_window_seconds}s, burst capacity: {self.burst_capacity}"
        )
    
    async def acquire(self, tokens: int = 1) -> None:
        """
        Acquire tokens from the bucket.
        
        Args:
            tokens: Number of tokens to acquire (default: 1)
            
        Raises:
            RateLimitExceededError: If not enough tokens are available
        """
        async with self._lock:
            await self._refill_tokens()
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                logger.debug(f"Acquired {tokens} tokens, {self.tokens} remaining")
            else:
                # Calculate wait time until enough tokens will be available
                wait_time = self._calculate_wait_time(tokens)
                
                logger.warning(
                    f"Rate limit exceeded. Need {tokens} tokens, "
                    f"have {self.tokens}. Wait time: {wait_time:.2f}s"
                )
                
                raise RateLimitExceededError(
                    f"Rate limit exceeded. {self.tokens}/{self.burst_capacity} tokens available.",
                    retry_after=int(wait_time) + 1,
                    details={
                        "tokens_needed": tokens,
                        "tokens_available": self.tokens,
                        "burst_capacity": self.burst_capacity,
                        "wait_time_seconds": wait_time
                    }
                )
    
    async def _refill_tokens(self) -> None:
        """Refill tokens based on elapsed time."""
        current_time = time.time()
        time_elapsed = current_time - self.last_refill_time
        
        if time_elapsed >= self.time_window_seconds:
            # Full refill
            self.tokens = self.burst_capacity
            self.last_refill_time = current_time
            logger.debug(f"Full refill: {self.tokens} tokens available")
        else:
            # Partial refill based on elapsed time
            tokens_to_add = (time_elapsed / self.time_window_seconds) * self.max_requests
            self.tokens = min(self.burst_capacity, self.tokens + tokens_to_add)
            self.last_refill_time = current_time
            
            if tokens_to_add > 0:
                logger.debug(f"Partial refill: added {tokens_to_add:.2f} tokens, {self.tokens:.2f} total")
    
    def _calculate_wait_time(self, tokens_needed: int) -> float:
        """
        Calculate wait time until enough tokens will be available.
        
        Args:
            tokens_needed: Number of tokens needed
            
        Returns:
            Wait time in seconds
        """
        tokens_deficit = tokens_needed - self.tokens
        
        if tokens_deficit <= 0:
            return 0.0
        
        # Calculate time needed to generate enough tokens
        tokens_per_second = self.max_requests / self.time_window_seconds
        wait_time = tokens_deficit / tokens_per_second
        
        return wait_time
    
    async def wait_for_tokens(self, tokens: int = 1) -> None:
        """
        Wait until enough tokens are available, then acquire them.
        
        This method will block until the rate limit allows the request
        to proceed, unlike acquire() which raises an exception.
        
        Args:
            tokens: Number of tokens to acquire (default: 1)
        """
        while True:
            try:
                await self.acquire(tokens)
                return
            except RateLimitExceededError as e:
                wait_time = e.details.get("wait_time_seconds", 1.0)
                logger.info(f"Waiting {wait_time:.2f}s for rate limit reset")
                await asyncio.sleep(wait_time)
    
    def get_status(self) -> dict:
        """
        Get current rate limiter status.
        
        Returns:
            Dictionary with current status information
        """
        return {
            "tokens_available": self.tokens,
            "burst_capacity": self.burst_capacity,
            "max_requests": self.max_requests,
            "time_window_seconds": self.time_window_seconds,
            "utilization_percent": (self.burst_capacity - self.tokens) / self.burst_capacity * 100
        }
    
    def reset(self) -> None:
        """Reset the rate limiter to full capacity."""
        self.tokens = self.burst_capacity
        self.last_refill_time = time.time()
        logger.info("Rate limiter reset to full capacity")
    
    async def __aenter__(self) -> "RateLimiter":
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        """Async context manager exit."""
        # No cleanup needed for rate limiter
        pass


class DefaultRateLimiter:
    """
    Default rate limiter instance for convenience.
    
    Provides a singleton-like rate limiter with default settings
    that can be used throughout the application.
    """
    
    _instance: Optional[RateLimiter] = None
    
    @classmethod
    def get_instance(cls) -> RateLimiter:
        """
        Get the default rate limiter instance.
        
        Returns:
            RateLimiter instance with default settings
        """
        if cls._instance is None:
            cls._instance = RateLimiter()
        return cls._instance
    
    @classmethod
    def reset_instance(cls) -> None:
        """Reset the default rate limiter instance."""
        cls._instance = None