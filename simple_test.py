#!/usr/bin/env python3
import urllib.request
import time

time.sleep(2)

try:
    response = urllib.request.urlopen('http://localhost:3000/')
    print(f"SUCCESS: {response.status}")
except Exception as e:
    print(f"ERROR: {e}")
