"""Unit tests for rate limiter."""

import asyncio
import time
import pytest

from app.services.rate_limiter import RateLimiter, DefaultRateLimiter
from app.services.exceptions import RateLimitExceededError


class TestRateLimiter:
    """Test cases for RateLimiter."""
    
    @pytest.fixture
    def limiter(self) -> RateLimiter:
        """Create a rate limiter for testing."""
        return RateLimiter(max_requests=5, time_window_seconds=1)
    
    @pytest.mark.asyncio
    async def test_initialization(self) -> None:
        """Test rate limiter initialization."""
        limiter = RateLimiter(max_requests=10, time_window_seconds=60)
        
        assert limiter.max_requests == 10
        assert limiter.time_window_seconds == 60
        assert limiter.burst_capacity == 10
        assert limiter.tokens == 10
    
    @pytest.mark.asyncio
    async def test_initialization_with_custom_burst(self) -> None:
        """Test rate limiter initialization with custom burst capacity."""
        limiter = RateLimiter(max_requests=10, time_window_seconds=60, burst_capacity=15)
        
        assert limiter.burst_capacity == 15
        assert limiter.tokens == 15
    
    @pytest.mark.asyncio
    async def test_acquire_success(self, limiter: RateLimiter) -> None:
        """Test successful token acquisition."""
        await limiter.acquire()
        assert limiter.tokens == 4
        
        await limiter.acquire(2)
        assert abs(limiter.tokens - 2) < 0.01
    
    @pytest.mark.asyncio
    async def test_acquire_rate_limit_exceeded(self, limiter: RateLimiter) -> None:
        """Test rate limit exceeded error."""
        # Use all tokens
        await limiter.acquire(5)
        
        # Next acquire should raise RateLimitExceededError
        with pytest.raises(RateLimitExceededError) as exc_info:
            await limiter.acquire()
        
        assert "Rate limit exceeded" in str(exc_info.value)
        assert exc_info.value.retry_after is not None
        assert exc_info.value.details["tokens_needed"] == 1
        assert exc_info.value.details["tokens_available"] < 0.01
    
    @pytest.mark.asyncio
    async def test_acquire_multiple_tokens_rate_limit(self, limiter: RateLimiter) -> None:
        """Test rate limit when acquiring multiple tokens."""
        # Use some tokens
        await limiter.acquire(3)
        
        # Try to acquire more than available
        with pytest.raises(RateLimitExceededError) as exc_info:
            await limiter.acquire(4)
        
        assert exc_info.value.details["tokens_needed"] == 4
        assert abs(exc_info.value.details["tokens_available"] - 2) < 0.01
    
    @pytest.mark.asyncio
    async def test_wait_for_tokens(self, limiter: RateLimiter) -> None:
        """Test waiting for tokens."""
        # Use all tokens
        await limiter.acquire(5)
        
        # This should wait and then succeed
        start_time = time.time()
        await limiter.wait_for_tokens()
        end_time = time.time()
        
        # Should have waited at least some time for token refill
        assert end_time - start_time >= 0.1  # Allow some tolerance
    
    @pytest.mark.asyncio
    async def test_token_refill(self, limiter: RateLimiter) -> None:
        """Test token refill over time."""
        # Use all tokens
        await limiter.acquire(5)
        assert limiter.tokens == 0
        
        # Wait for refill (time window is 1 second)
        await asyncio.sleep(1.1)
        
        # Try to acquire again - should work after refill
        await limiter.acquire()
        assert limiter.tokens >= 0
    
    @pytest.mark.asyncio
    async def test_partial_refill(self) -> None:
        """Test partial token refill."""
        limiter = RateLimiter(max_requests=10, time_window_seconds=2)
        
        # Use all tokens
        await limiter.acquire(10)
        assert limiter.tokens == 0
        
        # Wait for half the time window
        await asyncio.sleep(1)
        
        # Should have partial refill
        # Note: Due to timing precision, we check that we have some tokens
        # Trigger a refill to get updated token count
        await limiter._refill_tokens()
        assert limiter.tokens > 0
        assert limiter.tokens < 10
    
    @pytest.mark.asyncio
    async def test_concurrent_access(self, limiter: RateLimiter) -> None:
        """Test concurrent access to rate limiter."""
        async def acquire_tokens():
            try:
                await limiter.acquire(2)
                return True
            except RateLimitExceededError:
                return False
        
        # Try to acquire tokens concurrently
        tasks = [acquire_tokens() for _ in range(3)]
        results = await asyncio.gather(*tasks)
        
        # Only 2 should succeed (5 tokens total, each needs 2)
        assert sum(results) == 2
    
    def test_get_status(self, limiter: RateLimiter) -> None:
        """Test getting rate limiter status."""
        status = limiter.get_status()
        
        assert status["tokens_available"] == 5
        assert status["burst_capacity"] == 5
        assert status["max_requests"] == 5
        assert status["time_window_seconds"] == 1
        assert status["utilization_percent"] == 0.0
    
    def test_get_status_after_usage(self, limiter: RateLimiter) -> None:
        """Test getting status after using some tokens."""
        # Use some tokens synchronously for this test
        limiter.tokens = 2
        
        status = limiter.get_status()
        
        assert status["tokens_available"] == 2
        assert status["utilization_percent"] == 60.0  # (5-2)/5 * 100
    
    def test_reset(self, limiter: RateLimiter) -> None:
        """Test resetting rate limiter."""
        # Use some tokens
        limiter.tokens = 1
        
        # Reset
        limiter.reset()
        
        assert limiter.tokens == 5
        assert limiter.burst_capacity == 5
    
    @pytest.mark.asyncio
    async def test_async_context_manager(self) -> None:
        """Test using rate limiter as async context manager."""
        limiter = RateLimiter(max_requests=5, time_window_seconds=1)
        
        async with limiter:
            await limiter.acquire()
            assert limiter.tokens == 4
    
    @pytest.mark.asyncio
    async def test_calculate_wait_time(self, limiter: RateLimiter) -> None:
        """Test wait time calculation."""
        # Use all tokens
        limiter.tokens = 0
        
        wait_time = limiter._calculate_wait_time(1)
        assert wait_time > 0
        
        wait_time = limiter._calculate_wait_time(3)
        assert wait_time > 0
        
        # If we have enough tokens, wait time should be 0
        limiter.tokens = 5
        wait_time = limiter._calculate_wait_time(3)
        assert wait_time == 0.0


class TestDefaultRateLimiter:
    """Test cases for DefaultRateLimiter."""
    
    def test_get_instance(self) -> None:
        """Test getting default instance."""
        limiter1 = DefaultRateLimiter.get_instance()
        limiter2 = DefaultRateLimiter.get_instance()
        
        # Should return the same instance
        assert limiter1 is limiter2
        assert isinstance(limiter1, RateLimiter)
    
    def test_reset_instance(self) -> None:
        """Test resetting default instance."""
        limiter1 = DefaultRateLimiter.get_instance()
        
        # Reset instance
        DefaultRateLimiter.reset_instance()
        
        # Get new instance - should be different
        limiter2 = DefaultRateLimiter.get_instance()
        
        assert limiter1 is not limiter2
    
    @pytest.mark.asyncio
    async def test_default_instance_usage(self) -> None:
        """Test using default instance."""
        limiter = DefaultRateLimiter.get_instance()
        
        # Should be able to acquire tokens
        await limiter.acquire()
        assert limiter.tokens >= 0