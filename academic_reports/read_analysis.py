import json
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 read_analysis.py <bucket_name>")
        return

    bucket = sys.argv[1]
    
    try:
        with open('analysis.json', 'r') as f:
            data = json.load(f)
            
        if bucket in data:
            print(json.dumps(data[bucket], indent=2))
        else:
            print(f"Bucket '{bucket}' not found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
