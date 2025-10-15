"""
Unit tests for health router.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.services.exceptions import (
    ProviderAuthenticationError,
    RateLimitExceededError,
    AIProviderError,
    ChironBaseError
)

client = TestClient(app)


class TestHealthCheckEndpoint:
    """Test cases for /health/health endpoint."""

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_health_check_success(self, mock_get_provider):
        """Test successful health check."""
        mock_provider = AsyncMock()
        mock_provider.validate_connection.return_value = True
        mock_provider.__class__.__name__ = "OpenRouterClient"
        mock_get_provider.return_value = mock_provider

        response = client.get("/health/health")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"
        assert data["provider"] == "OpenRouterClient"
        assert "timestamp" in data

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_health_check_connection_failed(self, mock_get_provider):
        """Test health check when provider connection fails."""
        mock_provider = AsyncMock()
        mock_provider.validate_connection.return_value = False
        mock_provider.__class__.__name__ = "OpenRouterClient"
        mock_get_provider.return_value = mock_provider

        response = client.get("/health/health")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "unhealthy"
        assert data["detail"]["reason"] == "Provider connection failed"
        assert data["detail"]["provider"] == "OpenRouterClient"

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_health_check_authentication_error(self, mock_get_provider):
        """Test health check with authentication error."""
        mock_get_provider.side_effect = ProviderAuthenticationError("Invalid API key")

        response = client.get("/health/health")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "unhealthy"
        assert data["detail"]["reason"] == "Provider authentication failed"

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_health_check_rate_limit_error(self, mock_get_provider):
        """Test health check with rate limit error."""
        mock_get_provider.side_effect = RateLimitExceededError("Rate limit exceeded")

        response = client.get("/health/health")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "unhealthy"
        assert data["detail"]["reason"] == "Provider rate limit exceeded"

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_health_check_provider_error(self, mock_get_provider):
        """Test health check with provider error."""
        mock_get_provider.side_effect = AIProviderError("Provider error")

        response = client.get("/health/health")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "unhealthy"
        assert data["detail"]["reason"] == "Provider error occurred"

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_health_check_chiron_error(self, mock_get_provider):
        """Test health check with chiron error."""
        mock_get_provider.side_effect = ChironBaseError("Service error")

        response = client.get("/health/health")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "unhealthy"
        assert data["detail"]["reason"] == "Service error occurred"

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_health_check_unexpected_error(self, mock_get_provider):
        """Test health check with unexpected error."""
        mock_get_provider.side_effect = Exception("Unexpected error")

        response = client.get("/health/health")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "unhealthy"
        assert data["detail"]["reason"] == "Unexpected error occurred"


class TestReadinessCheckEndpoint:
    """Test cases for /health/ready endpoint."""

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_readiness_check_success(self, mock_get_provider):
        """Test successful readiness check."""
        mock_provider = MagicMock()
        mock_provider.__class__.__name__ = "OpenRouterClient"
        mock_get_provider.return_value = mock_provider

        response = client.get("/health/ready")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ready"
        assert data["provider"] == "OpenRouterClient"
        assert "timestamp" in data

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_readiness_check_no_provider(self, mock_get_provider):
        """Test readiness check when no provider is configured."""
        mock_get_provider.return_value = None

        response = client.get("/health/ready")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "not_ready"
        assert data["detail"]["reason"] == "No provider configured"

    @patch('app.routers.health.ProviderFactory.get_provider')
    def test_readiness_check_unexpected_error(self, mock_get_provider):
        """Test readiness check with unexpected error."""
        mock_get_provider.side_effect = Exception("Unexpected error")

        response = client.get("/health/ready")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "not_ready"
        assert data["detail"]["reason"] == "Unexpected error occurred"


class TestRouterIntegration:
    """Test cases for router integration."""

    def test_router_prefix(self):
        """Test that router has correct prefix."""
        from app.routers.health import router
        assert router.prefix == "/health"

    def test_router_tags(self):
        """Test that router has correct tags."""
        from app.routers.health import router
        assert "health" in router.tags

    def test_endpoint_paths(self):
        """Test that endpoints have correct paths."""
        from app.routers.health import router
        
        # Get all route paths
        paths = [route.path for route in router.routes]
        
        assert "/health/health" in paths
        assert "/health/ready" in paths