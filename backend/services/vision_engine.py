import io
import os
from google.cloud import vision
from utils import logger

# Configure Google Vision Client
def init_vision_client():
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path or not os.path.exists(creds_path):
        logger.warn("Google Vision credentials not found. Vision OCR may fail.")
    return vision.ImageAnnotatorClient()

def extract_text_from_image(image_bytes: bytes):
    client = init_vision_client()
    image = vision.Image(content=image_bytes)
    response = client.document_text_detection(image=image)
    if response.error.message:
        logger.error(f"Vision API Error: {response.error.message}")
        return ""
    return response.full_text_annotation.text

def extract_handwritten_notes(image_bytes: bytes):
    """Use Vision API for handwriting recognition"""
    client = init_vision_client()
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)
    text = "\n".join([d.description for d in response.text_annotations]) if response.text_annotations else ""
    return text
