import json
import re

def fix_arduino_json(json_str):
    """Fix common Arduino JSON issues"""
    try:
        # Remove [SEND] prefix
        if json_str.startswith('[SEND] '):
            json_str = json_str[7:]
        
        # Replace NaN with null
        json_str = json_str.replace(':nan,', ':null,').replace(':nan}', ':null}')
        
        # Remove trailing commas
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # Fix incomplete timestamp at end - this is the main issue!
        # Pattern: "timestamp":123456 (missing closing braces)
        if '"timestamp":' in json_str:
            # Find the last timestamp and see if it's incomplete
            if re.search(r'"timestamp":\d+$', json_str):
                # Add missing closing braces for timestamp and its parent objects
                json_str = re.sub(r'"timestamp":(\d+)$', r'"timestamp":\1}}', json_str)
            elif re.search(r'"timestamp":\d+(?=,"\w)', json_str):
                # Handle case where timestamp is followed by more data
                json_str = re.sub(r'"timestamp":(\d+)(?=,"\w)', r'"timestamp":\1}}', json_str)
        
        # Ensure we have proper closing for the main JSON structure
        open_braces = json_str.count('{')
        close_braces = json_str.count('}')
        missing_braces = open_braces - close_braces
        
        if missing_braces > 0:
            json_str += '}' * missing_braces
        
        # Try to parse - if it fails, try more aggressive fixes
        try:
            parsed = json.loads(json_str)
            return json.dumps(parsed, indent=2)
        except:
            # More aggressive fix for incomplete JSON
            # Try to detect where the JSON got cut off and close it properly
            if '"sensors":' in json_str and not json_str.strip().endswith('}}'):
                # Find the last complete sensor entry and close everything
                last_brace_pos = json_str.rfind('}')
                if last_brace_pos > 0:
                    json_str = json_str[:last_brace_pos + 1] + '}}'
            
            parsed = json.loads(json_str)
            return json.dumps(parsed, indent=2)
        
    except Exception as e:
        return f"Error: {e}\nOriginal: {json_str[:100]}...\nProcessed: {json_str[-100:] if len(json_str) > 100 else json_str}"

# Test with multiple problematic patterns
test_cases = [
    '{"t":123456,"sensors":{"SOLAR_CURRENT":{"current":{"value":0.000,"unit":"A","timestamp":123456',
    '[SEND] {"t":123456,"sensors":{"SOLAR_CURRENT":{"current":{"value":0.000,"unit":"A","timestamp":123456',
    '{"t":123456,"sensors":{"DHT22_FEEDER":{"temperature":{"value":25.5,"unit":"°C","timestamp":123456},"humidity":{"value":60,"unit":"%","timestamp":123457}},"SOLAR_CURRENT":{"current":{"value":0.000,"unit":"A","timestamp":123456'
]

print("Testing JSON fixer with multiple cases:")
for i, test_json in enumerate(test_cases, 1):
    print(f"\n=== Test Case {i} ===")
    print(f"Input (last 50 chars): ...{test_json[-50:]}")
    result = fix_arduino_json(test_json)
    if result.startswith("Error:"):
        print(f"❌ {result}")
    else:
        print("✅ Fixed successfully!")
        # Show only the structure, not all data
        try:
            parsed = json.loads(result)
            if 'sensors' in parsed:
                sensors = list(parsed['sensors'].keys())
                print(f"   Sensors found: {sensors}")
        except:
            pass 