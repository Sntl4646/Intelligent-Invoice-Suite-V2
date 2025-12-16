# This is the Invoice Extractor module. It uses a hybrid approach combining
# direct text extraction from PDFs and advanced LLMs (Gemini and GPT-4) to extract structured
# invoice data. The module preprocesses the text to remove irrelevant sections and ensure
import os
import re
import json
import base64
import httpx
import ssl
import fitz  # PyMuPDF
from utils import logger
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

# ============================================================================
# DISABLE ALL SSL VERIFICATION (FOR CORPORATE/RESTRICTED NETWORKS)
# ============================================================================
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["SSL_CERT_FILE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["PYTHONHTTPSVERIFY"] = "0"

# Disable SSL warnings
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Create insecure HTTP clients
openai_insecure_client = httpx.Client(verify=False, timeout=60.0)

# Monkey-patch ssl to disable verification globally
ssl._create_default_https_context = ssl._create_unverified_context


def preprocess_invoice_text(text: str) -> str:
    """
    Cleans PDF text before model processing.
    - Skips Terms & Conditions and legal sections
    - Handles mixed capitalization and Unicode spacing
    - Keeps only invoice/order-relevant content
    """

    if not text:
        return ""

    original_length = len(text)
    
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)
    lower_text = text.lower()

    # --- Smart cutoff: remove everything after legal/terms sections ---
    # Look for FULL section headers, not partial matches
    tnc_patterns = [
        r"i\.\s+general\s+1\.\s+unless",  # "I. General 1. Unless"
        r"general\s+terms\s+and\s+conditions\s+of\s+sale,\s+performance\s+and\s+delivery\s*$",
    ]

    cut_index = None
    for pat in tnc_patterns:
        match = re.search(pat, lower_text, re.IGNORECASE)
        if match:
            cut_index = match.start()
            logger.info(f"[Preprocess] ✂️ Found T&C at index {cut_index}, cutting...")
            break

    if cut_index and cut_index > 1000:  # Only cut if we have substantial content before it
        text = text[:cut_index]
        logger.info(f"[Preprocess] ✂️ Cut text from {original_length} to {len(text)} chars")
    elif cut_index:
        logger.info(f"[Preprocess] ⚠️ T&C found too early at {cut_index}, keeping full text")
    
    # --- Clean lines but keep invoice data ---
    lines = []
    for line in text.splitlines():
        l = line.strip()
        if not l:
            continue
        
        # Skip ONLY the final legal disclaimer lines
        if re.search(r"^(grace gmbh\s+status:|general terms and conditions of sale)", l.lower()):
            break  # Stop processing once we hit the final legal section
            
        lines.append(l)

    cleaned = "\n".join(lines).strip()
    
    if len(cleaned) > 30000:
        cleaned = cleaned[:30000]
        logger.info("[Preprocess] Truncated text to 30K chars.")

    logger.info(f"[Preprocess] ✅ Final cleaned text length: {len(cleaned)} chars")
    return cleaned


def extract_text_from_pdf(file_path: str) -> str:
    """Extracts text from PDF using PyMuPDF."""
    try:
        doc = fitz.open(file_path)
        text = "\n".join(page.get_text("text") for page in doc)
        doc.close()
        return text.strip()
    except Exception as e:
        logger.error(f"[Extractor] PDF text extraction failed: {e}")
        return ""


def extract_invoice_data(file_path: str):
    """
    Hybrid Extractor:
    - PyMuPDF for text extraction
    - Gemini Vision for OCR if no text
    - GPT-4 fallback if mapping fails
    
    CRITICAL: file_path must be an actual file path, not extracted text content
    """
    
    # DEBUG logging
    logger.info(f"[Extractor] 🔍 DEBUG - Function called with: {type(file_path)}")
    logger.info(f"[Extractor] 🔍 DEBUG - Value preview: {str(file_path)[:200]}")

    # VALIDATION: Ensure we have a valid file path
    if not isinstance(file_path, str) or not os.path.exists(file_path):
        logger.error(f"[Extractor] ❌ Invalid file path: {file_path}")
        return {
            "Vendor Name": "Unknown Vendor",
            "Invoice or Order Number": "N/A",
            "Issue Date": None,
            "Due Date": None,
            "Subtotal": 0,
            "Tax Amount": 0,
            "Total Amount": 0,
            "Currency": "",
            "Payment Terms": "",
            "Notes": "File not found or invalid path",
            "Line Items": [],
            "Additional Fields": {},
        }

    logger.info(f"[Extractor] ✅ Processing file: {file_path}")

    # --- Base prompt (same across models) ---
    base_prompt = """
You are an expert invoice and order acknowledgment data extractor.

Your task: Extract structured JSON data, even if labels differ, based on semantic meaning.

JSON schema:
{
  "Vendor Name": "",
  "Vendor Address": "",
  "Vendor Phone": "",
  "Vendor Email": "",
  "Vendor Tax ID": "",
  "Invoice or Order Number": "",
  "Issue Date": "",
  "Due Date": "",
  "Currency": "",
  "Subtotal": 0,
  "Tax Amount": 0,
  "Total Amount": 0,
  "Payment Terms": "",
  "Notes": "",
  "Line Items": [
    {
      "Description": "",
      "Quantity": "",
      "Unit Price": "",
      "Amount": "",
      "Additional Fields": {}
    }
  ],
  "Additional Fields": {}
}

Mapping rules:
- Extract vendor details from the top/header section (company name, address, phone, email)
- "Ust-ID-Nr" or "VAT ID" or "Tax ID" → "Vendor Tax ID"
- "Order No." or "PO No." or "Our order no." → "Invoice or Order Number"
- "Invoice Date" or "Date" or document date → "Issue Date"
- "Due net within 60 days" → "Payment Terms"
- Use numeric values near "Total" or "Total Amount" as Total Amount
- For dates, use ISO format YYYY-MM-DD (convert DD.MM.YYYY to YYYY-MM-DD)
- Sum all line items to calculate totals
- Combine multi-line addresses into single string
- Always output **valid JSON only**, no markdown formatting
"""

    try:
        # Try different Gemini models in order of preference
        gemini_models = [
            "gemini-1.5-flash",      # Stable, widely available
            "gemini-1.5-pro",        # More capable
            "gemini-2.0-flash-exp",  # Experimental, might be quota limited
        ]
        
        llm_gemini = None
        for model_name in gemini_models:
            try:
                llm_gemini = ChatGoogleGenerativeAI(
                    model=model_name, 
                    temperature=0.1,
                    google_api_key=os.getenv("GOOGLE_API_KEY")
                )
                logger.info(f"[Extractor] Using Gemini model: {model_name}")
                break
            except Exception as model_error:
                logger.info(f"[Extractor] Model {model_name} not available: {model_error}")
                continue
        
        if not llm_gemini:
            raise Exception("No Gemini models available")
        
        # Extract text from the PDF file
        text = extract_text_from_pdf(file_path)
        cleaned_text = preprocess_invoice_text(text)

        logger.info(f"[Extractor] 📄 Extracted text length: {len(cleaned_text)} characters")

        if len(cleaned_text) > 500:
            logger.info("[Extractor] ✅ Digital PDF detected — Gemini text mode.")
            full_prompt = base_prompt + "\n\nExtract data from this document:\n" + cleaned_text[:25000]
            response = llm_gemini.invoke(full_prompt)
        else:
            logger.info("[Extractor] 🧾 Scanned PDF or minimal text — Gemini Vision mode.")
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()
            
            # Use Gemini's native document processing
            message = HumanMessage(
                content=[
                    {"type": "text", "text": base_prompt},
                    {
                        "type": "image_url",
                        "image_url": f"data:application/pdf;base64,{base64.b64encode(pdf_bytes).decode()}"
                    }
                ]
            )
            response = llm_gemini.invoke([message])

        content = getattr(response, "content", str(response))
        logger.info(f"[Extractor] 📤 Raw Gemini response preview: {content[:300]}")
        
        # Extract JSON from response
        content = content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        
        # Find JSON object
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON found in Gemini output. Content: {content[:500]}")
        
        json_str = match.group(0)
        logger.info(f"[Extractor] 🔍 Extracted JSON string preview: {json_str[:300]}")
        
        data = json.loads(json_str)

        # Validate that we got meaningful data
        if not any(data.get(k) for k in ["Vendor Name", "Invoice or Order Number", "Total Amount"]):
            raise ValueError(f"Gemini incomplete mapping. Got: {list(data.keys())}")

        logger.info("[Extractor] ✅ Gemini extracted invoice successfully.")
        return data

    except Exception as gemini_error:
        logger.info(f"[Extractor] ⚠️ Gemini failed: {str(gemini_error)[:200]}")
        logger.info(f"[Extractor] ⚠️ Trying GPT-4 fallback...")

    # --- GPT-4 fallback with SSL disabled ---
    try:
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY not found in environment")
        
        logger.info("[Extractor] 🔧 Initializing GPT-4 with SSL disabled...")
            
        llm_openai = ChatOpenAI(
            model="gpt-4-turbo",
            temperature=0.1,
            openai_api_key=openai_api_key,
            http_client=openai_insecure_client,  # SSL disabled
            max_retries=3,
            request_timeout=60
        )
        
        # Extract text again (in case Gemini failed before extraction)
        text = extract_text_from_pdf(file_path)
        cleaned_text = preprocess_invoice_text(text)

        logger.info("[Extractor] 🧠 Running GPT-4 fallback extraction.")
        logger.info(f"[Extractor] 📤 Sending {len(cleaned_text)} chars to GPT-4...")
        
        full_prompt = base_prompt + "\n\nExtract data from this text:\n" + cleaned_text[:25000]
        response = llm_openai.invoke(full_prompt)
        
        content = getattr(response, "content", str(response))
        logger.info(f"[Extractor] 📤 Raw GPT-4 response preview: {content[:300]}")
        
        content = content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON found in GPT-4 output. Content: {content[:500]}")
        
        data = json.loads(match.group(0))

        logger.info("[Extractor] ✅ Successfully extracted via GPT-4 fallback.")
        return data

    except Exception as openai_error:
        import traceback
        logger.error(f"[Extractor] ❌ Both Gemini and GPT-4 failed.")
        logger.error(f"[Extractor] ❌ Gemini error: {str(gemini_error)[:200] if 'gemini_error' in locals() else 'N/A'}")
        logger.error(f"[Extractor] ❌ GPT-4 error: {openai_error}")
        logger.error(f"[Extractor] ❌ GPT-4 traceback:\n{traceback.format_exc()}")
        
        return {
            "Vendor Name": "Unknown Vendor",
            "Invoice or Order Number": "N/A",
            "Issue Date": None,
            "Due Date": None,
            "Subtotal": 0,
            "Tax Amount": 0,
            "Total Amount": 0,
            "Currency": "",
            "Payment Terms": "",
            "Notes": f"Extraction failed - Gemini: {str(gemini_error)[:100] if 'gemini_error' in locals() else 'N/A'}, GPT-4: {str(openai_error)[:100]}",
            "Line Items": [],
            "Additional Fields": {},
        }
# services/invoice_extractor.py - IMPROVED EXTRACTION PROMPT
# Add this improved prompt to your extract_invoice_data function

IMPROVED_EXTRACTION_PROMPT = """
You are an expert invoice data extraction specialist.

CRITICAL: Extract ALL line items with COMPLETE information:
- Description (what was purchased/service provided)
- Quantity (number of items/hours) - REQUIRED
- Unit Price (price per item) - REQUIRED  
- Amount/Total (Quantity × Unit Price) - REQUIRED

If Quantity is missing, assume 1.
If Unit Price is missing but Amount is present, calculate: Unit Price = Amount / Quantity
If Amount is missing, calculate: Amount = Quantity × Unit Price

JSON schema (STRICT):
{
  "Vendor Name": "string",
  "Vendor Address": "string",
  "Vendor Phone": "string",
  "Vendor Email": "string",
  "Vendor Tax ID": "string",
  "Invoice or Order Number": "string",
  "Issue Date": "YYYY-MM-DD",
  "Due Date": "YYYY-MM-DD",
  "Currency": "USD",
  "Subtotal": 0.00,
  "Tax Amount": 0.00,
  "Total Amount": 0.00,
  "Payment Terms": "string",
  "Notes": "string",
  "Line Items": [
    {
      "Description": "Product/Service name",
      "Quantity": 1.0,
      "Unit Price": 100.00,
      "Amount": 100.00
    }
  ]
}

VALIDATION RULES:
1. EVERY line item MUST have Quantity, Unit Price, and Amount
2. Amount should equal Quantity × Unit Price (within rounding)
3. Sum of all Amounts should equal Subtotal
4. Subtotal + Tax Amount should equal Total Amount
5. Use 1.0 as default Quantity if not specified
6. Extract numbers without currency symbols ($, €, etc.)
7. Dates MUST be in YYYY-MM-DD format

LINE ITEM PATTERNS TO RECOGNIZE:
- Table format: | Description | Qty | Price | Total |
- List format: "Item X - Qty: 5 @ $10.00 = $50.00"
- Paragraph format: "5 units of Product A at $10 each ($50 total)"
- Service format: "Consulting - 8 hours @ $150/hr = $1,200"

COMMON FIELD NAMES (map these to schema):
Quantity: Qty, Units, Count, Hours, Pieces, #
Unit Price: Rate, Price, Unit Cost, Per Unit, Each
Amount: Total, Line Total, Extended Price, Sum

Return ONLY valid JSON. No explanations, no markdown.
"""


def extract_invoice_data_improved(file_path: str):
    """
    Enhanced extraction with better line item handling.
    """
    import os
    import re
    import json
    import base64
    import fitz
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage
    from utils import logger
    
    logger.info(f"[Extractor] Processing: {file_path}")
    
    # Extract text
    text = ""
    try:
        doc = fitz.open(file_path)
        text = "\n".join(page.get_text("text") for page in doc)
        doc.close()
    except Exception as e:
        logger.error(f"[Extractor] PDF text extraction failed: {e}")
    
    cleaned_text = text[:25000]  # Limit size
    
    try:
        # Try Gemini first
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.1,
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
        
        if len(cleaned_text) > 500:
            # Text-based extraction
            full_prompt = IMPROVED_EXTRACTION_PROMPT + f"\n\nExtract from:\n{cleaned_text}"
            response = llm.invoke(full_prompt)
        else:
            # Vision-based extraction
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()
            
            message = HumanMessage(
                content=[
                    {"type": "text", "text": IMPROVED_EXTRACTION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": f"data:application/pdf;base64,{base64.b64encode(pdf_bytes).decode()}"
                    }
                ]
            )
            response = llm.invoke([message])
        
        content = getattr(response, "content", str(response)).strip()
        
        # Clean markdown formatting
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'^```\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        content = content.strip()
        
        # Extract JSON
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if not match:
            raise ValueError("No JSON found in response")
        
        data = json.loads(match.group(0))
        
        # 🔥 POST-PROCESSING: Ensure all line items have required fields
        if "Line Items" in data and isinstance(data["Line Items"], list):
            for item in data["Line Items"]:
                # Ensure Quantity exists
                if "Quantity" not in item or not item["Quantity"]:
                    item["Quantity"] = 1.0
                
                # Ensure numeric types
                item["Quantity"] = float(item.get("Quantity", 1.0))
                item["Unit Price"] = float(item.get("Unit Price", 0.0))
                item["Amount"] = float(item.get("Amount", 0.0))
                
                # Calculate missing Amount
                if item["Amount"] == 0 and item["Unit Price"] > 0:
                    item["Amount"] = item["Quantity"] * item["Unit Price"]
                
                # Calculate missing Unit Price
                elif item["Unit Price"] == 0 and item["Amount"] > 0:
                    item["Unit Price"] = item["Amount"] / item["Quantity"]
        
        logger.success("[Extractor] ✅ Extraction successful with complete line items")
        return data
        
    except Exception as e:
        logger.error(f"[Extractor] ❌ Extraction failed: {e}")
        return {
            "Vendor Name": "Unknown",
            "Invoice or Order Number": "N/A",
            "Total Amount": 0,
            "Line Items": [],
            "Notes": f"Extraction error: {str(e)}"
        }