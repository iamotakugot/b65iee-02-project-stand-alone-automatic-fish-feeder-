#!/usr/bin/env python3
"""
🐟 Fish Feeder IoT System - Setup Configuration
==============================================
Package setup for modular Fish Feeder IoT System

Author: Fish Feeder IoT Team
"""

from setuptools import setup, find_packages
import os

# Read README for long description
def read_readme():
    try:
        with open("README_MODULAR.md", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "Fish Feeder IoT System - Modular Architecture"

# Read requirements
def read_requirements():
    try:
        with open("requirements_modular.txt", "r", encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip() and not line.startswith("#")]
    except FileNotFoundError:
        return ["pyserial>=3.5", "firebase-admin>=6.0.0", "Flask>=2.3.0", "Flask-CORS>=4.0.0"]

setup(
    name="fish-feeder-iot",
    version="2.0.0",
    description="Fish Feeder IoT System - Modular Architecture",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    author="Fish Feeder IoT Team",
    author_email="team@fishfeeder-iot.com",
    url="https://github.com/fish-feeder-iot/pi-server",
    
    # Package configuration
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    
    # Python version requirement
    python_requires=">=3.8",
    
    # Dependencies
    install_requires=read_requirements(),
    
    # Optional dependencies
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "colorlog>=6.7.0"
        ],
        "production": [
            "gunicorn>=21.0.0"
        ]
    },
    
    # Entry points
    entry_points={
        "console_scripts": [
            "fish-feeder=main_modular:main",
            "fish-feeder-legacy=main:main"
        ]
    },
    
    # Package classification
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Topic :: System :: Hardware",
        "Topic :: Home Automation",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Operating System :: POSIX :: Linux",
        "Operating System :: Microsoft :: Windows"
    ],
    
    # Keywords
    keywords="iot, arduino, raspberry-pi, firebase, fish-feeder, automation, sensors",
    
    # Project URLs
    project_urls={
        "Bug Reports": "https://github.com/fish-feeder-iot/pi-server/issues",
        "Source": "https://github.com/fish-feeder-iot/pi-server",
        "Documentation": "https://github.com/fish-feeder-iot/pi-server/blob/main/README_MODULAR.md"
    }
) 