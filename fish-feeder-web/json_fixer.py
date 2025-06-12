import json
import re

def fix_arduino_json(raw_line):
    """Fix Arduino JSON that's cut off at timestamp"""
    try:
        # Remove [SEND] prefix
        if raw_line.startswith('[SEND] '):
            json_str = raw_line[7:]
        else:
            json_str = raw_line
        
        print(f"Original: {json_str}")
        
        # Replace NaN with null
        json_str = json_str.replace(':nan,', ':null,').replace(':nan}', ':null}')
        
        # The main problem: incomplete timestamp
        # Pattern: "timestamp":123456 at end without closing }}
        if '"timestamp":' in json_str and re.search(r'"timestamp":\d+$', json_str):
            print("🔧 Found incomplete timestamp at end")
            # Add the missing closing braces
            json_str = re.sub(r'"timestamp":(\d+)$', r'"timestamp":\1}}', json_str)
            print(f"After fix: {json_str}")
        
        # Parse and validate
        data = json.loads(json_str)
        return data
        
    except Exception as e:
        print(f"❌ Still failed: {e}")
        return None

# Test with the exact pattern from the error log
test_line = '[SEND] {"t":123456,"sensors":{"SOLAR_CURRENT":{"current":{"value":0.000,"unit":"A","timestamp":123456'

print("🧪 Testing with problematic Arduino output:")
result = fix_arduino_json(test_line)
if result:
    print("✅ Success! Parsed JSON:")
    print(json.dumps(result, indent=2))
    if 'sensors' in result:
        print(f"Sensors found: {list(result['sensors'].keys())}")
else:
    print("❌ Failed to fix JSON") 