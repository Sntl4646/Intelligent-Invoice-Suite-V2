"""
Custom logger utility with colored output for better readability.
"""
import logging
import sys
from datetime import datetime


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for different log levels."""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'SUCCESS': '\033[92m',    # Bright Green
    }
    RESET = '\033[0m'
    
    def format(self, record):
        # Add color to level name
        if record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.RESET}"
        return super().format(record)


# Create custom logger
class CustomLogger:
    """Custom logger with additional success method."""
    
    def __init__(self, name="InvoiceAI"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        
        # Remove existing handlers
        self.logger.handlers.clear()
        
        # Console handler with custom formatter
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        
        # Format: timestamp | level | message
        formatter = ColoredFormatter(
            fmt='%(asctime)s | %(levelname)s | %(message)s',
            datefmt='%H:%M:%S'
        )
        console_handler.setFormatter(formatter)
        
        self.logger.addHandler(console_handler)
    
    def debug(self, message):
        """Debug level logging."""
        self.logger.debug(message)
    
    def info(self, message):
        """Info level logging."""
        self.logger.info(message)
    
    def warning(self, message):
        """Warning level logging."""
        self.logger.warning(message)
    
    def error(self, message):
        """Error level logging."""
        self.logger.error(message)
    
    def critical(self, message):
        """Critical level logging."""
        self.logger.critical(message)
    
    def success(self, message):
        """Success level logging (custom)."""
        # Create a custom log record for success
        self.logger.log(logging.INFO, f"✅ {message}")


# Create singleton instance
_logger_instance = CustomLogger()

# Export the methods directly for easier imports
debug = _logger_instance.debug
info = _logger_instance.info
warning = _logger_instance.warning
error = _logger_instance.error
critical = _logger_instance.critical
success = _logger_instance.success

# Also export the logger object itself
logger = _logger_instance