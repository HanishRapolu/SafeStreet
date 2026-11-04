"""
Configuration module for AI Models Server
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

# Set config directories for libraries to avoid permission issues
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_appdata = os.path.join(BASE_DIR, '.appdata')
os.makedirs(os.path.join(_appdata, 'AppData', 'Roaming', 'Ultralytics'), exist_ok=True)
os.makedirs(os.path.join(_appdata, 'matplotlib'), exist_ok=True)
os.makedirs(os.path.join(_appdata, 'torch'), exist_ok=True)
os.environ.setdefault('APPDATA', os.path.join(_appdata, 'AppData', 'Roaming'))
os.environ.setdefault('LOCALAPPDATA', os.path.join(_appdata, 'AppData', 'Local'))
os.environ.setdefault('USERPROFILE', _appdata)
os.environ.setdefault('HOME', _appdata)
os.environ.setdefault('YOLO_CONFIG_DIR', os.path.join(_appdata, 'AppData', 'Roaming', 'Ultralytics'))
os.environ.setdefault('MPLCONFIGDIR', os.path.join(_appdata, 'matplotlib'))
os.environ.setdefault('TORCH_HOME', os.path.join(_appdata, 'torch'))

# Flask configuration
FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'

# Upload configuration
UPLOAD_FOLDER = "static/uploads"
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

# CORS configuration
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')

# API configuration
API_VERSION = "2.0.0"

# Model configuration
ENABLE_VIT = os.getenv('ENABLE_VIT', 'false').lower() == 'true'

# Model file paths
VIT_MODEL_PATH = "models/vit_model.pt"
YOLO_MODEL_PATH = "models/yolo_model.pt"
CNN_ROAD_CLASSIFIER_PATH = "models/cnn_road_classifier.pth"  # Updated to use available .pth file
CLASS_NAMES_PATH = "models/class_names.txt"

# Gemini API configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
GOOGLE_API_KEY = GEMINI_API_KEY  # Alternative naming
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')

# Default confidence thresholds
DEFAULT_CONFIDENCE_THRESHOLD = 0.6
DEFAULT_YOLO_CONFIDENCE = 0.5

# Logging configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
