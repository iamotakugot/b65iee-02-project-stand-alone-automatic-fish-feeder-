"""
🌐 Fish Feeder IoT API Package
=============================
RESTful API endpoints for Fish Feeder IoT System

API Modules:
- web_api: Flask web server and REST endpoints
- routes: API route definitions and handlers
"""

from .web_api import WebAPI

__all__ = [
    'WebAPI'
] 