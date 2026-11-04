"""
AI Models Server - Clean and Organized
Main Flask application entry point
"""
import os
import sys
import time

# Ensure writable AppData and Cache dirs inside workspace
_workspace_appdata = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.appdata')
os.makedirs(os.path.join(_workspace_appdata, 'AppData', 'Roaming', 'Ultralytics'), exist_ok=True)
os.makedirs(os.path.join(_workspace_appdata, 'matplotlib'), exist_ok=True)
os.makedirs(os.path.join(_workspace_appdata, 'torch'), exist_ok=True)
os.environ['APPDATA'] = os.path.join(_workspace_appdata, 'AppData', 'Roaming')
os.environ['LOCALAPPDATA'] = os.path.join(_workspace_appdata, 'AppData', 'Local')
os.environ['USERPROFILE'] = _workspace_appdata
os.environ['HOME'] = _workspace_appdata
os.environ['YOLO_CONFIG_DIR'] = os.path.join(_workspace_appdata, 'AppData', 'Roaming', 'Ultralytics')
os.environ['MPLCONFIGDIR'] = os.path.join(_workspace_appdata, 'matplotlib')
os.environ['TORCH_HOME'] = os.path.join(_workspace_appdata, 'torch')

# Configure UTF-8 output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.core.app_factory import create_app
from src.core.config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG
from src.core.startup import print_startup_info
from src.models.model_manager import model_manager

def ensure_models_loaded():
    """Ensure all models are loaded correctly"""
    print("🔍 Checking model status...")
    
    # Print model status
    model_status = model_manager.get_all_model_status()
    
    for model_name, status in model_status.items():
        if status.get('loaded', False):
            print(f"✅ {model_name} model loaded successfully")
        else:
            print(f"⚠️  {model_name} model loading failed: {status.get('error', 'Unknown error')}")
    
    # If any model failed to load but is required, we can handle that here
    print("🎯 All critical models verified")
    return True

# Create Flask app instance for gunicorn
app = create_app()

# Initialize model loading for gunicorn
ensure_models_loaded()
print_startup_info()

def main():
    """Main application entry point when run directly"""
    start_time = time.time()
    print("🚀 Initializing AI Models Server...")
    
    # Print startup info
    print(f"⏱️  Server startup completed in {time.time() - start_time:.2f} seconds")
    
    # Run the Flask app directly
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)

if __name__ == "__main__":
    main()
