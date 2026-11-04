"""
Damage Assessment Utilities
Maps YOLO road damage classes to human-readable damage types,
calculates severity scores and priority rankings.
"""
from typing import List, Dict, Any, Optional, Tuple

DAMAGE_CLASS_TABLE = {
    # Cracks (base score = 1)
    "D00": {
        "damageType": "Longitudinal Crack",
        "category": "cracks",
        "base_score": 1
    },
    "D01": {
        "damageType": "Longitudinal Joint Crack",
        "category": "cracks",
        "base_score": 1
    },
    "D10": {
        "damageType": "Transverse Crack",
        "category": "cracks",
        "base_score": 1
    },
    "D11": {
        "damageType": "Transverse Joint Crack",
        "category": "cracks",
        "base_score": 1
    },
    "D30": {
        "damageType": "Rutting / Bump",
        "category": "cracks",
        "base_score": 1
    },

    # Pothole / Alligator (base score = 2)
    "D20": {
        "damageType": "Alligator Crack",
        "category": "pothole/alligator",
        "base_score": 2
    },
    "D40": {
        "damageType": "Pothole",
        "category": "pothole/alligator",
        "base_score": 2
    },

    # Markings / Utility (base score = 0)
    "D0w0": {
        "damageType": "Road Marking Defect",
        "category": "markings/utility",
        "base_score": 0
    },
    "D43": {
        "damageType": "Crosswalk Blur",
        "category": "markings/utility",
        "base_score": 0
    },
    "D44": {
        "damageType": "Lane Marking Blur",
        "category": "markings/utility",
        "base_score": 0
    },
    "D50": {
        "damageType": "Utility Cover",
        "category": "markings/utility",
        "base_score": 0
    }
}


def get_damage_type(class_code: str) -> str:
    """Return human-readable damageType for a given class code."""
    if class_code in DAMAGE_CLASS_TABLE:
        return DAMAGE_CLASS_TABLE[class_code]["damageType"]
    return "Road Damage"


def get_base_score(class_code: str) -> int:
    """Return base score for a damage class: pothole/alligator=2, cracks=1, markings/utility=0."""
    if class_code in DAMAGE_CLASS_TABLE:
        return DAMAGE_CLASS_TABLE[class_code]["base_score"]
    return 1


def assess_damage(
    detections: List[Dict[str, Any]], 
    image_width: int, 
    image_height: int
) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]], str, int]:
    """
    Assesses damage detections:
    1. Enriches each detection with human damageType.
    2. Identifies primary detection (highest confidence).
    3. Computes severity from primary detection:
       - Base score: pothole/alligator = 2, cracks = 1, markings/utility = 0
       - +1 if box area covers >15% of the image
       - +1 more if box area covers >40% of the image
       - Score >= 3: HIGH, Score == 2: MEDIUM, else: LOW
    4. Computes priority (1-10):
       - LOW: 3, MEDIUM: 5, HIGH: 8
       - +1 if more than 2 detections (capped at 10)
    
    Returns:
        (enriched_detections, primary_detection_dict, severity, priority)
    """
    enriched_detections = []
    for det in detections:
        c_code = det.get("class", "")
        enriched_det = dict(det)
        enriched_det["damageType"] = get_damage_type(c_code)
        enriched_detections.append(enriched_det)

    if not enriched_detections:
        return enriched_detections, None, "LOW", 3

    # Primary detection: highest confidence
    primary_det = max(enriched_detections, key=lambda d: d.get("confidence", 0.0))
    primary_class = primary_det.get("class", "")
    primary = {
        "class": primary_class,
        "damageType": get_damage_type(primary_class),
        "confidence": primary_det.get("confidence", 0.0)
    }

    # Calculate coverage of primary box
    base_score = get_base_score(primary_class)
    bbox = primary_det.get("bbox", [])
    coverage = 0.0

    if len(bbox) >= 4 and image_width > 0 and image_height > 0:
        box_w = max(0.0, float(bbox[2]) - float(bbox[0]))
        box_h = max(0.0, float(bbox[3]) - float(bbox[1]))
        box_area = box_w * box_h
        image_area = float(image_width * image_height)
        coverage = box_area / image_area

    score = base_score
    if coverage > 0.15:
        score += 1
    if coverage > 0.40:
        score += 1

    if score >= 3:
        severity = "HIGH"
        base_priority = 8
    elif score == 2:
        severity = "MEDIUM"
        base_priority = 5
    else:
        severity = "LOW"
        base_priority = 3

    priority = base_priority
    if len(enriched_detections) > 2:
        priority += 1

    priority = max(1, min(10, priority))

    return enriched_detections, primary, severity, priority
