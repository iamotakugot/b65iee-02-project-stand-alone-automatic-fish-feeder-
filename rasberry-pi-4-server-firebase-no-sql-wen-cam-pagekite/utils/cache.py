#!/usr/bin/env python3
"""
💾 Data Cache Module
==================
High-performance data caching system for Fish Feeder IoT
- In-memory caching with TTL (Time To Live)
- Thread-safe operations
- Performance optimization for sensor data
- Memory-efficient cache management

Author: Fish Feeder IoT Team
"""

import time
import threading
from typing import Dict, Any, Optional
from .config import Config

class DataCache:
    """Thread-safe data cache with TTL support"""
    
    def __init__(self):
        self.cache: Dict[str, Any] = {}
        self.timestamps: Dict[str, float] = {}
        self.lock = threading.RLock()  # Reentrant lock for thread safety
        
    def get(self, key: str, max_age: int = None) -> Optional[Any]:
        """Get cached data if not expired - Thread-safe"""
        if max_age is None:
            max_age = Config.CACHE_DURATION
            
        with self.lock:
            if key not in self.cache:
                return None
            
            # Check if data has expired
            age = time.time() - self.timestamps.get(key, 0)
            if age > max_age:
                # Remove expired data
                self._remove_key(key)
                return None
            
            return self.cache[key]
    
    def set(self, key: str, value: Any) -> None:
        """Set cached data with timestamp - Thread-safe"""
        with self.lock:
            self.cache[key] = value
            self.timestamps[key] = time.time()
    
    def has(self, key: str, max_age: int = None) -> bool:
        """Check if key exists and is not expired"""
        if max_age is None:
            max_age = Config.CACHE_DURATION
            
        with self.lock:
            if key not in self.cache:
                return False
            
            age = time.time() - self.timestamps.get(key, 0)
            if age > max_age:
                self._remove_key(key)
                return False
            
            return True
    
    def remove(self, key: str) -> bool:
        """Remove specific key from cache"""
        with self.lock:
            return self._remove_key(key)
    
    def _remove_key(self, key: str) -> bool:
        """Internal method to remove key (not thread-safe)"""
        removed = False
        if key in self.cache:
            del self.cache[key]
            removed = True
        if key in self.timestamps:
            del self.timestamps[key]
            removed = True
        return removed
    
    def clear(self, key: str = None) -> None:
        """Clear specific key or all cache - Thread-safe"""
        with self.lock:
            if key:
                self._remove_key(key)
            else:
                self.cache.clear()
                self.timestamps.clear()
    
    def cleanup_expired(self, max_age: int = None) -> int:
        """Remove all expired entries and return count removed"""
        if max_age is None:
            max_age = Config.CACHE_DURATION
            
        current_time = time.time()
        expired_keys = []
        
        with self.lock:
            # Find expired keys
            for key, timestamp in self.timestamps.items():
                if current_time - timestamp > max_age:
                    expired_keys.append(key)
            
            # Remove expired keys
            for key in expired_keys:
                self._remove_key(key)
        
        return len(expired_keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self.lock:
            current_time = time.time()
            total_keys = len(self.cache)
            expired_count = 0
            
            # Count expired keys
            for timestamp in self.timestamps.values():
                if current_time - timestamp > Config.CACHE_DURATION:
                    expired_count += 1
            
            return {
                'total_keys': total_keys,
                'active_keys': total_keys - expired_count,
                'expired_keys': expired_count,
                'cache_hit_potential': (total_keys - expired_count) / max(total_keys, 1) * 100
            }
    
    def get_all_keys(self) -> list:
        """Get all cache keys (for debugging)"""
        with self.lock:
            return list(self.cache.keys())
    
    def get_key_age(self, key: str) -> Optional[float]:
        """Get age of specific key in seconds"""
        with self.lock:
            if key not in self.timestamps:
                return None
            return time.time() - self.timestamps[key]
    
    def refresh(self, key: str) -> bool:
        """Refresh timestamp of existing key without changing value"""
        with self.lock:
            if key in self.cache:
                self.timestamps[key] = time.time()
                return True
            return False
    
    def size(self) -> int:
        """Get current cache size"""
        with self.lock:
            return len(self.cache)
    
    def is_empty(self) -> bool:
        """Check if cache is empty"""
        with self.lock:
            return len(self.cache) == 0 