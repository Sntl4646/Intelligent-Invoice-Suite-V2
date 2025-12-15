import pdfplumber
import fitz  # PyMuPDF
from utils import logger
import json

def extract_pdf_text(file_path: str):
    logger.info(f"Extracting text from {file_path} ...")
    text_content = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text_content += page.extract_text() or ""
    except Exception as e:
        logger.error(f"Error extracting text: {e}")
    return text_content

def extract_pdf_tables(file_path: str):
    logger.info(f"Extracting tables from {file_path} ...")
    tables_data = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for t in tables:
                    tables_data.append(t)
    except Exception as e:
        logger.error(f"Error extracting tables: {e}")
    return tables_data

def extract_images(file_path: str):
    """Extract images from PDF (optional)"""
    images = []
    try:
        doc = fitz.open(file_path)
        for page in doc:
            for img_index, img in enumerate(page.get_images(full=True)):
                xref = img[0]
                pix = fitz.Pixmap(doc, xref)
                if pix.n < 5:  # RGB
                    images.append(pix.tobytes())
                else:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                    images.append(pix.tobytes())
                pix = None
    except Exception as e:
        logger.error(f"Error extracting images: {e}")
    return images

def parse_invoice_data(text, tables):
    """
    Lightweight parsing before LLM — identifies invoice number, total, etc.
    """
    parsed = {"invoice_number": None, "total": None, "vendor_name": None}
    for line in text.splitlines():
        line_lower = line.lower()
        if "invoice" in line_lower and "no" in line_lower:
            parsed["invoice_number"] = line.split()[-1]
        if "total" in line_lower:
            try:
                parsed["total"] = float(line.split()[-1].replace(",", ""))
            except Exception:
                pass
    parsed["tables"] = tables
    return parsed
