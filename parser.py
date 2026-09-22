import sys
import json
import re

content = sys.stdin.read()
# Framer stores data in a large JSON object. Let's look for patterns like "name" or "university"
# and also "location"
matches = re.findall(r'"name":"([^"]+)"', content)
# This might return FAQ names too.
# Let's look for university names specifically.
# Based on previous output, I'll search for the slugs and see what's near them.
slug_pattern = re.compile(r'niat-([a-z-]+)')
slugs = slug_pattern.findall(content)

for slug in sorted(set(slugs)):
    print(f"Slug: {slug}")
