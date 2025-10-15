"""Unit tests for logging infrastructure."""

import json
import logging
import pytest
from unittest.mock import patch, MagicMock
from contextvars import ContextVar

from app.utils.logging import (
    StructuredFormatter,
    TextFormatter,
    LoggerMixin,
    setup_logging,
    set_correlation_id,
    get_correlation_id,
    set_request_id,
    get_request_id,
    set_provider_context,
    get_provider_context,
    clear_context,
    LoggingContext,
    log_function_call,
    log_async_function_call,
    correlation_id,
    request_id,
    provider_context,
)


class TestStructuredFormatter:
    """Test cases for StructuredFormatter."""

    def test_format_basic_log(self):
        """Test formatting basic log entry."""
        formatter = StructuredFormatter("test-service")
        
        # Create log record
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None
        )
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        assert log_entry["level"] == "INFO"
        assert log_entry["message"] == "Test message"
        assert log_entry["service"] == "test-service"
        assert log_entry["logger"] == "test.logger"
        assert log_entry["line"] == 42
        assert "timestamp" in log_entry
        assert "correlation_id" not in log_entry

    def test_format_with_correlation_id(self):
        """Test formatting log with correlation ID."""
        formatter = StructuredFormatter()
        
        # Set correlation ID
        correlation_id.set("test-corr-123")
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None
        )
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        assert log_entry["correlation_id"] == "test-corr-123"

    def test_format_with_provider_context(self):
        """Test formatting log with provider context."""
        formatter = StructuredFormatter()
        
        # Set provider context
        provider_context.set({"provider": "openrouter", "model": "gpt-4"})
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None
        )
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        assert log_entry["provider_context"]["provider"] == "openrouter"
        assert log_entry["provider_context"]["model"] == "gpt-4"

    def test_format_with_exception(self):
        """Test formatting log with exception."""
        formatter = StructuredFormatter()
        
        try:
            raise ValueError("Test error")
        except Exception:
            exc_info = (ValueError, ValueError("Test error"), None)
        else:
            exc_info = None
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.ERROR,
            pathname="/test/path.py",
            lineno=42,
            msg="Error message",
            args=(),
            exc_info=exc_info
        )
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        assert "exception" in log_entry
        assert log_entry["exception"]["type"] == "ValueError"
        assert log_entry["exception"]["message"] == "Test error"

    def test_format_with_extra_fields(self):
        """Test formatting log with extra fields."""
        formatter = StructuredFormatter()
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None
        )
        
        # Add extra field
        record.custom_field = "custom_value"
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        assert log_entry["custom_field"] == "custom_value"


class TestTextFormatter:
    """Test cases for TextFormatter."""

    def test_format_basic_log(self):
        """Test formatting basic text log entry."""
        # Clear any existing context
        clear_context()
        
        formatter = TextFormatter("test-service")
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None
        )
        
        formatted = formatter.format(record)
        
        assert "INFO" in formatted
        assert "test.logger:42" in formatted
        assert "Test message" in formatted
        assert "[corr:" not in formatted  # No correlation context brackets
        assert "[provider:" not in formatted  # No provider context brackets

    def test_format_with_correlation_id(self):
        """Test formatting text log with correlation ID."""
        formatter = TextFormatter()
        
        correlation_id.set("test-corr-123")
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None
        )
        
        formatted = formatter.format(record)
        
        assert "corr:test-corr-123" in formatted

    def test_format_with_provider_context(self):
        """Test formatting text log with provider context."""
        formatter = TextFormatter()
        
        provider_context.set({"provider": "openrouter", "model": "gpt-4"})
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None
        )
        
        formatted = formatter.format(record)
        
        assert "provider:openrouter" in formatted


class TestLoggerMixin:
    """Test cases for LoggerMixin."""

    def test_logger_property(self):
        """Test logger property returns correct logger."""
        class TestClass(LoggerMixin):
            pass
        
        instance = TestClass()
        logger = instance.logger
        
        assert isinstance(logger, logging.Logger)
        assert "TestClass" in logger.name

    def test_log_with_context(self):
        """Test logging with context."""
        class TestClass(LoggerMixin):
            pass
        
        instance = TestClass()
        
        with patch.object(instance.logger, 'log') as mock_log:
            correlation_id.set("test-corr")
            provider_context.set({"provider": "openrouter"})
            
            instance.log_with_context(
                logging.INFO,
                "Test message",
                extra={"custom": "field"},
                another_field="value"
            )
            
            mock_log.assert_called_once()
            call_args = mock_log.call_args
            
            assert call_args[0][0] == logging.INFO  # level
            assert call_args[0][1] == "Test message"  # message
            
            extra = call_args[1]["extra"]
            assert extra["correlation_id"] == "test-corr"
            assert extra["provider_context"]["provider"] == "openrouter"
            assert extra["custom"] == "field"
            assert extra["another_field"] == "value"

    def test_convenience_methods(self):
        """Test convenience logging methods."""
        class TestClass(LoggerMixin):
            pass
        
        instance = TestClass()
        
        with patch.object(instance, 'log_with_context') as mock_log:
            instance.debug("Debug message")
            mock_log.assert_called_once_with(logging.DEBUG, "Debug message")
            
            mock_log.reset_mock()
            instance.info("Info message")
            mock_log.assert_called_once_with(logging.INFO, "Info message")
            
            mock_log.reset_mock()
            instance.warning("Warning message")
            mock_log.assert_called_once_with(logging.WARNING, "Warning message")
            
            mock_log.reset_mock()
            instance.error("Error message")
            mock_log.assert_called_once_with(logging.ERROR, "Error message")
            
            mock_log.reset_mock()
            instance.critical("Critical message")
            mock_log.assert_called_once_with(logging.CRITICAL, "Critical message")


class TestContextManagement:
    """Test cases for context management functions."""

    def test_set_and_get_correlation_id(self):
        """Test setting and getting correlation ID."""
        # Clear any existing correlation ID
        correlation_id.set(None)
        
        # Test with provided ID
        result = set_correlation_id("test-id")
        assert result == "test-id"
        assert get_correlation_id() == "test-id"
        
        # Test with generated ID
        result = set_correlation_id()
        assert result is not None
        assert len(result) > 0
        assert get_correlation_id() == result

    def test_set_and_get_request_id(self):
        """Test setting and getting request ID."""
        # Clear any existing request ID
        request_id.set(None)
        
        # Test with provided ID
        result = set_request_id("req-123")
        assert result == "req-123"
        assert get_request_id() == "req-123"
        
        # Test with generated ID
        result = set_request_id()
        assert result is not None
        assert len(result) > 0
        assert get_request_id() == result

    def test_set_and_get_provider_context(self):
        """Test setting and getting provider context."""
        # Clear any existing context
        provider_context.set(None)
        
        set_provider_context("openrouter", "gpt-4", timeout=30)
        context = get_provider_context()
        
        assert context["provider"] == "openrouter"
        assert context["model"] == "gpt-4"
        assert context["timeout"] == 30

    def test_clear_context(self):
        """Test clearing all context."""
        correlation_id.set("test")
        request_id.set("test")
        provider_context.set({"provider": "test"})
        
        clear_context()
        
        assert get_correlation_id() is None
        assert get_request_id() is None
        assert get_provider_context() is None


class TestLoggingContext:
    """Test cases for LoggingContext context manager."""

    def test_context_manager_sets_and_restores(self):
        """Test that context manager sets and restores context."""
        # Set initial context
        correlation_id.set("initial-corr")
        request_id.set("initial-req")
        provider_context.set({"provider": "initial"})
        
        # Use context manager
        with LoggingContext(
            correlation_id="new-corr",
            request_id="new-req",
            provider="new-provider",
            model="new-model"
        ):
            assert get_correlation_id() == "new-corr"
            assert get_request_id() == "new-req"
            
            context = get_provider_context()
            assert context["provider"] == "new-provider"
            assert context["model"] == "new-model"
        
        # Context should be restored
        assert get_correlation_id() == "initial-corr"
        assert get_request_id() == "initial-req"
        
        context = get_provider_context()
        assert context["provider"] == "initial"

    def test_context_manager_partial_context(self):
        """Test context manager with partial context."""
        # Clear context first
        clear_context()
        
        with LoggingContext(provider="openrouter"):
            assert get_correlation_id() is None
            assert get_request_id() is None
            
            context = get_provider_context()
            assert context["provider"] == "openrouter"
            assert "model" not in context


class TestSetupLogging:
    """Test cases for setup_logging function."""

    @patch('app.utils.logging.logging.getLogger')
    def test_setup_logging_json(self, mock_get_logger):
        """Test setting up JSON logging."""
        mock_logger = MagicMock()
        mock_get_logger.return_value = mock_logger
        
        setup_logging(level="DEBUG", format_type="json", service_name="test-service")
        
        # getLogger is called multiple times (root logger + httpx, httpcore, tenacity)
        assert mock_get_logger.call_count >= 1
        # Check that DEBUG level was set for the root logger
        mock_logger.setLevel.assert_any_call(logging.DEBUG)
        mock_logger.handlers.clear.assert_called_once()
        
        # Check that handler was added
        assert mock_logger.addHandler.called
        handler = mock_logger.addHandler.call_args[0][0]
        assert isinstance(handler.formatter, StructuredFormatter)

    @patch('app.utils.logging.logging.getLogger')
    def test_setup_logging_text(self, mock_get_logger):
        """Test setting up text logging."""
        mock_logger = MagicMock()
        mock_get_logger.return_value = mock_logger
        
        setup_logging(level="INFO", format_type="text")
        
        handler = mock_logger.addHandler.call_args[0][0]
        assert isinstance(handler.formatter, TextFormatter)


class TestFunctionDecorators:
    """Test cases for function logging decorators."""

    def test_log_function_call_success(self):
        """Test function call decorator on successful execution."""
        mock_logger = MagicMock()
        
        @log_function_call(mock_logger)
        def test_function(x, y):
            return x + y
        
        result = test_function(1, 2)
        
        assert result == 3
        
        # Check debug calls
        assert mock_logger.debug.call_count == 2
        
        # First call - function entry
        entry_call = mock_logger.debug.call_args_list[0]
        assert "Calling" in entry_call[0][0]
        
        # Second call - function completion
        completion_call = mock_logger.debug.call_args_list[1]
        assert "Completed" in completion_call[0][0]
        assert completion_call[1]["success"] is True
        assert "duration_seconds" in completion_call[1]

    def test_log_function_call_exception(self):
        """Test function call decorator on exception."""
        mock_logger = MagicMock()
        
        @log_function_call(mock_logger)
        def test_function():
            raise ValueError("Test error")
        
        with pytest.raises(ValueError):
            test_function()
        
        # Check debug and error calls
        assert mock_logger.debug.call_count == 1
        assert mock_logger.error.call_count == 1
        
        # Error call should include exception details
        error_call = mock_logger.error.call_args
        assert error_call[1]["success"] is False
        assert error_call[1]["error_type"] == "ValueError"
        assert error_call[1]["error_message"] == "Test error"

    @pytest.mark.asyncio
    async def test_log_async_function_call_success(self):
        """Test async function call decorator on successful execution."""
        mock_logger = MagicMock()
        
        @log_async_function_call(mock_logger)
        async def test_function(x, y):
            return x + y
        
        result = await test_function(1, 2)
        
        assert result == 3
        
        # Check debug calls
        assert mock_logger.debug.call_count == 2
        
        # First call - function entry
        entry_call = mock_logger.debug.call_args_list[0]
        assert "Calling async" in entry_call[0][0]
        
        # Second call - function completion
        completion_call = mock_logger.debug.call_args_list[1]
        assert "Completed async" in completion_call[0][0]
        assert completion_call[1]["extra"]["success"] is True

    @pytest.mark.asyncio
    async def test_log_async_function_call_exception(self):
        """Test async function call decorator on exception."""
        mock_logger = MagicMock()
        
        @log_async_function_call(mock_logger)
        async def test_function():
            raise ValueError("Test error")
        
        with pytest.raises(ValueError):
            await test_function()
        
        # Check debug and error calls
        assert mock_logger.debug.call_count == 1
        assert mock_logger.error.call_count == 1
        
        # Error call should include exception details
        error_call = mock_logger.error.call_args
        assert error_call[1]["extra"]["success"] is False
        assert error_call[1]["extra"]["error_type"] == "ValueError"