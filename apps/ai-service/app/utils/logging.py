"""Logging infrastructure for AI service.

This module provides structured logging with correlation IDs, service context,
and provider context for debugging and monitoring.
"""

import json
import logging
import time
import uuid
from contextvars import ContextVar
from typing import Any, Dict, Optional
from datetime import datetime

# Context variables for request tracing
correlation_id: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)
request_id: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
provider_context: ContextVar[Optional[Dict[str, Any]]] = ContextVar('provider_context', default=None)


class StructuredFormatter(logging.Formatter):
    """
    Structured JSON formatter for consistent log formatting.
    
    Outputs logs in JSON format with correlation IDs, timestamps, and structured context.
    """
    
    def __init__(self, service_name: str = "ai-service"):
        """Initialize the structured formatter."""
        super().__init__()
        self.service_name = service_name
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON."""
        # Create base log entry
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service_name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add correlation ID if available
        corr_id = correlation_id.get()
        if corr_id:
            log_entry["correlation_id"] = corr_id
        
        # Add request ID if available
        req_id = request_id.get()
        if req_id:
            log_entry["request_id"] = req_id
        
        # Add provider context if available
        prov_ctx = provider_context.get()
        if prov_ctx:
            log_entry["provider_context"] = prov_ctx
        
        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info)
            }
        
        # Add extra fields from record
        for key, value in record.__dict__.items():
            if key not in {
                'name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                'filename', 'module', 'lineno', 'funcName', 'created',
                'msecs', 'relativeCreated', 'thread', 'threadName',
                'processName', 'process', 'getMessage', 'exc_info',
                'exc_text', 'stack_info'
            }:
                log_entry[key] = value
        
        return json.dumps(log_entry, default=str)


class TextFormatter(logging.Formatter):
    """
    Text formatter with correlation ID support for human-readable logs.
    """
    
    def __init__(self, service_name: str = "ai-service"):
        """Initialize the text formatter."""
        super().__init__()
        self.service_name = service_name
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as readable text."""
        # Build the base message
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        base_msg = f"[{timestamp}] {record.levelname:8} {record.name}:{record.lineno} - {record.getMessage()}"
        
        # Add correlation context
        context_parts = []
        corr_id = correlation_id.get()
        if corr_id:
            context_parts.append(f"corr:{corr_id}")
        
        req_id = request_id.get()
        if req_id:
            context_parts.append(f"req:{req_id}")
        
        prov_ctx = provider_context.get()
        if prov_ctx:
            provider = prov_ctx.get("provider", "unknown")
            context_parts.append(f"provider:{provider}")
        
        if context_parts:
            base_msg += f" [{', '.join(context_parts)}]"
        
        # Add exception if present
        if record.exc_info:
            base_msg += f"\n{self.formatException(record.exc_info)}"
        
        return base_msg


class LoggerMixin:
    """
    Mixin class to add logging capabilities to any class.
    
    Provides methods for logging with automatic context inclusion.
    """
    
    @property
    def logger(self) -> logging.Logger:
        """Get logger for this class."""
        return logging.getLogger(f"{self.__class__.__module__}.{self.__class__.__name__}")
    
    def log_with_context(
        self,
        level: int,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> None:
        """
        Log a message with current context.
        
        Args:
            level: Logging level
            message: Log message
            extra: Additional fields to include
            **kwargs: Additional context fields
        """
        log_extra = {}
        
        # Add correlation context
        corr_id = correlation_id.get()
        if corr_id:
            log_extra["correlation_id"] = corr_id
        
        req_id = request_id.get()
        if req_id:
            log_extra["request_id"] = req_id
        
        prov_ctx = provider_context.get()
        if prov_ctx:
            log_extra["provider_context"] = prov_ctx
        
        # Add extra fields
        if extra:
            log_extra.update(extra)
        
        # Add kwargs
        log_extra.update(kwargs)
        
        self.logger.log(level, message, extra=log_extra)
    
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message with context."""
        self.log_with_context(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        """Log info message with context."""
        self.log_with_context(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message with context."""
        self.log_with_context(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs) -> None:
        """Log error message with context."""
        self.log_with_context(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs) -> None:
        """Log critical message with context."""
        self.log_with_context(logging.CRITICAL, message, **kwargs)


def setup_logging(
    level: str = "INFO",
    format_type: str = "json",
    service_name: str = "ai-service"
) -> None:
    """
    Setup logging configuration for the application.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_type: Log format type ('json' or 'text')
        service_name: Service name for log entries
    """
    # Convert string level to logging constant
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    # Create root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(numeric_level)
    
    # Set formatter based on format type
    if format_type.lower() == "json":
        formatter = StructuredFormatter(service_name)
    else:
        formatter = TextFormatter(service_name)
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Configure specific loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("tenacity").setLevel(logging.INFO)


def set_correlation_id(corr_id: Optional[str] = None) -> str:
    """
    Set correlation ID for the current context.
    
    Args:
        corr_id: Correlation ID to set. If None, generates a new UUID.
        
    Returns:
        The correlation ID that was set
    """
    if corr_id is None:
        corr_id = str(uuid.uuid4())
    correlation_id.set(corr_id)
    return corr_id


def get_correlation_id() -> Optional[str]:
    """
    Get the current correlation ID.
    
    Returns:
        Current correlation ID or None if not set
    """
    return correlation_id.get()


def set_request_id(req_id: Optional[str] = None) -> str:
    """
    Set request ID for the current context.
    
    Args:
        req_id: Request ID to set. If None, generates a new UUID.
        
    Returns:
        The request ID that was set
    """
    if req_id is None:
        req_id = str(uuid.uuid4())
    request_id.set(req_id)
    return req_id


def get_request_id() -> Optional[str]:
    """
    Get the current request ID.
    
    Returns:
        Current request ID or None if not set
    """
    return request_id.get()


def set_provider_context(
    provider: str,
    model: Optional[str] = None,
    **kwargs
) -> None:
    """
    Set provider context for the current context.
    
    Args:
        provider: Provider name
        model: Model name (optional)
        **kwargs: Additional provider context
    """
    ctx = {"provider": provider}
    if model:
        ctx["model"] = model
    ctx.update(kwargs)
    provider_context.set(ctx)


def get_provider_context() -> Optional[Dict[str, Any]]:
    """
    Get the current provider context.
    
    Returns:
        Current provider context or None if not set
    """
    return provider_context.get()


def clear_context() -> None:
    """Clear all context variables."""
    correlation_id.set(None)
    request_id.set(None)
    provider_context.set(None)


class LoggingContext:
    """
    Context manager for automatic logging context management.
    
    Usage:
        with LoggingContext(correlation_id="123", provider="openrouter"):
            # Logs within this block will have the context
            logger.info("This log includes correlation and provider context")
    """
    
    def __init__(
        self,
        correlation_id: Optional[str] = None,
        request_id: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        **kwargs
    ):
        """Initialize logging context."""
        self.correlation_id = correlation_id
        self.request_id = request_id
        self.provider = provider
        self.model = model
        self.extra_context = kwargs
        self._old_context = {}
    
    def __enter__(self):
        """Enter context and set context variables."""
        # Store old context
        self._old_context = {
            "correlation_id": correlation_id.get(),
            "request_id": request_id.get(),
            "provider_context": provider_context.get(),
        }
        
        # Set new context
        if self.correlation_id:
            set_correlation_id(self.correlation_id)
        
        if self.request_id:
            set_request_id(self.request_id)
        
        if self.provider:
            set_provider_context(self.provider, self.model, **self.extra_context)
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context and restore old context."""
        correlation_id.set(self._old_context["correlation_id"])
        request_id.set(self._old_context["request_id"])
        provider_context.set(self._old_context["provider_context"])


def log_function_call(logger: logging.Logger):
    """
    Decorator to log function calls with arguments and return values.
    
    Args:
        logger: Logger instance to use for logging
        
    Returns:
        Decorator function
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            # Log function entry
            logger.debug(
                f"Calling {func_name}",
                args_count=len(args),
                kwargs_keys=list(kwargs.keys())
            )
            
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                logger.debug(
                    f"Completed {func_name}",
                    duration_seconds=duration,
                    success=True
                )
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                
                logger.error(
                    f"Failed {func_name}",
                    duration_seconds=duration,
                    error_type=type(e).__name__,
                    error_message=str(e),
                    success=False
                )
                
                raise
        
        return wrapper
    return decorator


def log_async_function_call(logger: logging.Logger):
    """
    Decorator to log async function calls with arguments and return values.
    
    Args:
        logger: Logger instance to use for logging
        
    Returns:
        Decorator function
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            # Log function entry
            logger.debug(
                f"Calling async {func_name}",
                extra={
                    "args_count": len(args),
                    "kwargs_keys": list(kwargs.keys())
                }
            )
            
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                logger.debug(
                    f"Completed async {func_name}",
                    extra={
                        "duration_seconds": duration,
                        "success": True
                    }
                )
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                
                logger.error(
                    f"Failed async {func_name}",
                    extra={
                        "duration_seconds": duration,
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "success": False
                    }
                )
                
                raise
        
        return wrapper
    return decorator


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)