from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os, shutil
from datetime import datetime
import json
from models.invoice_model import Invoice
from models.vendor_model import Vendor
from models.database import get_db
from utils import logger
from services.invoice_extractor import extract_invoice_data
from openai import OpenAI, APIConnectionError, RateLimitError, APIError
from uuid import UUID
import time
import httpx
import urllib3

router = APIRouter()

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# =========================
# 🔹 Helpers
# =========================
def safe_float(value):
    """Safely convert value to float (handles None, '', or invalid types)."""
    try:
        if value is None or (isinstance(value, str) and value.strip() == ""):
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def summarize_invoice_data(extracted_data: dict):
    """Flatten extracted_data into a list of key-value pairs for UI display."""
    if not isinstance(extracted_data, dict):
        return []
    summary = []
    for key, value in extracted_data.items():
        if isinstance(value, (list, dict)):
            continue
        summary.append({"field": key, "value": str(value)})
    return summary

def normalize_line_items(extracted_data: dict) -> list:
    """
    Normalizes line items from various formats into a consistent structure.
    Handles missing quantity/unit price by calculating from total.
    """
    line_items = extracted_data.get("Line Items", [])
    if not isinstance(line_items, list):
        return []
    
    normalized = []
    for idx, item in enumerate(line_items):
        if not isinstance(item, dict):
            continue
        
        # Extract fields with fallback names
        description = (
            item.get("Description") or 
            item.get("Item") or 
            item.get("Product") or 
            item.get("Service") or 
            ""
        )
        
        quantity = safe_float(
            item.get("Quantity") or 
            item.get("Qty") or 
            item.get("Units") or 
            1.0  # Default to 1 if missing
        )
        
        unit_price = safe_float(
            item.get("Unit Price") or 
            item.get("Rate") or 
            item.get("Price") or 
            item.get("UnitPrice") or 
            0.0
        )
        
        line_total = safe_float(
            item.get("Amount") or 
            item.get("Total") or 
            item.get("Line Total") or 
            0.0
        )
        
        # Calculate missing values
        if line_total > 0 and unit_price == 0 and quantity > 0:
            unit_price = line_total / quantity
        elif line_total == 0 and unit_price > 0 and quantity > 0:
            line_total = unit_price * quantity
        elif unit_price > 0 and quantity == 0 and line_total > 0:
            quantity = line_total / unit_price
        
        normalized.append({
            "id": str(idx),
            "description": str(description).strip(),
            "quantity": round(quantity, 2),
            "unitPrice": round(unit_price, 2),
            "total": round(line_total, 2),
        })
    
    return normalized

def get_openai_client():
    """Create OpenAI client with SSL verification disabled."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API key not found in environment")
    
    # Create custom HTTP client with SSL verification disabled
    http_client = httpx.Client(
        verify=False,  # Disable SSL verification
        timeout=120.0
    )
    
    client = OpenAI(
        api_key=api_key,
        http_client=http_client,
        max_retries=2
    )
    
    return client


def analyze_invoice_text(text: str, max_retries: int = 3):
    """AI-driven invoice categorization + insight generation using OpenAI with retry logic."""
    if not text.strip():
        return {"category": "Unknown", "insights": "No text available for AI analysis."}

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("[AI Analysis] OpenAI API key not found in environment")
        return {"category": "General", "insights": "OpenAI API key not found in environment."}

    prompt = f"""
    You are an expert AI trained to interpret invoices.
    Given this text, provide:
    1️⃣ Category (e.g., Office Supplies, Consulting, Utilities, Software)
    2️⃣ A concise natural-language summary.

    Respond strictly in JSON format like:
    {{
        "category": "string",
        "insights": "string"
    }}

    --- INVOICE TEXT ---
    {text[:2000]}
    """

    # Retry loop with exponential backoff
    for attempt in range(max_retries):
        try:
            logger.info(f"[AI Analysis] Attempting OpenAI call (attempt {attempt + 1}/{max_retries})")
            
            # Get client with SSL disabled
            client = get_openai_client()
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=200,
                timeout=60  # Per-request timeout
            )

            content = response.choices[0].message.content.strip()
            logger.info("[AI Analysis] Successfully received OpenAI response")

            try:
                data = json.loads(content)
                return data
            except json.JSONDecodeError as je:
                logger.warning(f"[AI Analysis] Failed to parse JSON response: {je}")
                return {"category": "Uncategorized", "insights": content[:500]}

        except APIConnectionError as e:
            logger.error(f"[AI Analysis] Connection error (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                logger.info(f"[AI Analysis] Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                logger.error("[AI Analysis] Max retries reached for connection error")
                return {
                    "category": "Uncategorized",
                    "insights": "AI analysis unavailable due to connection issues. Please check your internet connection."
                }

        except RateLimitError as e:
            logger.error(f"[AI Analysis] Rate limit error: {e}")
            return {
                "category": "Uncategorized",
                "insights": "AI analysis temporarily unavailable due to rate limits. Please try again later."
            }

        except APIError as e:
            logger.error(f"[AI Analysis] OpenAI API error: {e}")
            return {
                "category": "Uncategorized",
                "insights": f"AI analysis failed due to API error. Please contact support."
            }

        except Exception as e:
            logger.error(f"[AI Analysis] Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "category": "Uncategorized",
                "insights": f"AI analysis encountered an unexpected error."
            }

    # Fallback if all retries fail
    return {
        "category": "Uncategorized",
        "insights": "AI analysis could not be completed after multiple attempts."
    }


UPLOAD_DIR = "uploaded_invoices"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# =========================
# 🔹 Upload Invoice
# =========================
@router.post("/upload", response_model=dict)
async def upload_invoice(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), user=None):
    """Uploads an invoice file, extracts key details via AI, and stores structured data."""
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"[Invoice Upload] Saved file: {file.filename}")

        extracted_data = extract_invoice_data(file_path)
        vendor_name = extracted_data.get("Vendor Name", "Unknown Vendor")
        vendor_address = extracted_data.get("Vendor Address")
        vendor_phone = extracted_data.get("Vendor Phone")
        vendor_email = extracted_data.get("Vendor Email")
        vendor_tax_id = extracted_data.get("Vendor Tax ID")

        invoice_number = extracted_data.get("Invoice or Order Number", "N/A")
        issue_date = extracted_data.get("Issue Date")
        due_date = extracted_data.get("Due Date")
        total_amount = safe_float(extracted_data.get("Total Amount", 0.0))

        result = await db.execute(select(Vendor).where(Vendor.name == vendor_name))
        vendor = result.scalars().first()

        if not vendor:
            vendor = Vendor(
                name=vendor_name,
                address=vendor_address,
                phone=vendor_phone,
                email=vendor_email,
                tax_id=vendor_tax_id,
            )
            db.add(vendor)
            await db.commit()
            await db.refresh(vendor)
        else:
            updated = False
            if vendor_address and not vendor.address:
                vendor.address = vendor_address
                updated = True
            if vendor_phone and not vendor.phone:
                vendor.phone = vendor_phone
                updated = True
            if vendor_email and not vendor.email:
                vendor.email = vendor_email
                updated = True
            if vendor_tax_id and not vendor.tax_id:
                vendor.tax_id = vendor_tax_id
                updated = True
            if updated:
                await db.commit()
                await db.refresh(vendor)

        parsed_issue_date = None
        parsed_due_date = None
        for date_str, var in [(issue_date, "issue"), (due_date, "due")]:
            if date_str:
                try:
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    try:
                        date_obj = datetime.strptime(date_str, "%d.%m.%Y").date()
                    except ValueError:
                        date_obj = None
                if var == "issue":
                    parsed_issue_date = date_obj
                else:
                    parsed_due_date = date_obj

        # Extract text (for AI summary)
        import fitz
        text = ""
        try:
            doc = fitz.open(file_path)
            for page_num, page in enumerate(doc):
                text += f"\n\n=== PAGE {page_num+1} ===\n{page.get_text('text')}"
            doc.close()
        except Exception as e:
            logger.warning(f"[Invoice Upload] PDF text extract failed: {e}")

        new_invoice = Invoice(
            invoice_number=invoice_number,
            vendor_id=vendor.id,
            issue_date=parsed_issue_date,
            due_date=parsed_due_date,
            subtotal=safe_float(extracted_data.get("Subtotal")),
            tax_amount=safe_float(extracted_data.get("Tax Amount")),
            total_amount=total_amount,
            payment_terms=extracted_data.get("Payment Terms", ""),
            notes=extracted_data.get("Notes", ""),
            status="processed",
            raw_text=text[:2000],
            extracted_data=extracted_data,
            file_path=file_path,
        )
        db.add(new_invoice)
        await db.commit()
        await db.refresh(new_invoice)

        return {
            "status": "success",
            "filename": file.filename,
            "vendor": vendor_name,
            "total_amount": total_amount,
            "invoice_id": str(new_invoice.id),
            "extracted": extracted_data,
        }

    except Exception as e:
        logger.error(f"[Invoice Upload] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# 🔹 List Invoices
# =========================
@router.get("/list", response_model=list)
async def list_invoices(db: AsyncSession = Depends(get_db)):
    """Fetch all invoices from the database with vendor info."""
    try:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Invoice).options(selectinload(Invoice.vendor)).order_by(Invoice.created_at.desc())
        )
        invoices = result.scalars().all()
        data = [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "vendor_name": inv.vendor.name if inv.vendor else "Unknown",
                "total_amount": safe_float(inv.total_amount),
                "status": inv.status,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            }
            for inv in invoices
        ]
        return data
    except Exception as e:
        logger.error(f"[Invoice List] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# 🔹 Invoice Detail
# =========================
@router.get("/{invoice_id}", response_model=dict)
async def get_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single invoice by ID with COMPLETE line items (qty, unit price, total)."""
    try:
        from sqlalchemy.orm import selectinload
        invoice_uuid = UUID(invoice_id)
        result = await db.execute(
            select(Invoice).options(selectinload(Invoice.vendor)).where(Invoice.id == invoice_uuid)
        )
        invoice = result.scalars().first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        extracted_data = invoice.extracted_data or {}
        summary_table = summarize_invoice_data(extracted_data)
        
        # Call AI analysis with retry logic
        ai_analysis = analyze_invoice_text(invoice.raw_text or "")

        # 🔥 FIX: Use normalize_line_items instead of manual extraction
        line_items = normalize_line_items(extracted_data)
        
        # 🔥 FIX: If no line items found but we have a total, create one
        if not line_items and invoice.total_amount and invoice.total_amount > 0:
            line_items = [{
                "id": "0",
                "description": extracted_data.get("Notes", "Invoice Total"),
                "quantity": 1.0,
                "unitPrice": safe_float(invoice.total_amount),
                "total": safe_float(invoice.total_amount),
            }]

        return {
            "id": str(invoice.id),
            "invoiceNumber": invoice.invoice_number,
            "invoice_number": invoice.invoice_number,
            "vendorName": invoice.vendor.name if invoice.vendor else "Unknown",
            "vendor_name": invoice.vendor.name if invoice.vendor else "Unknown",
            "invoiceDate": invoice.issue_date.isoformat() if invoice.issue_date else None,
            "issue_date": invoice.issue_date.isoformat() if invoice.issue_date else None,
            "dueDate": invoice.due_date.isoformat() if invoice.due_date else None,
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "subtotal": safe_float(invoice.subtotal),
            "taxAmount": safe_float(invoice.tax_amount),
            "tax_amount": safe_float(invoice.tax_amount),
            "total": safe_float(invoice.total_amount),
            "total_amount": safe_float(invoice.total_amount),
            "paymentTerms": invoice.payment_terms or "",
            "payment_terms": invoice.payment_terms or "",
            "status": invoice.status,
            "confidence": 95,
            "sourceType": "pdf",
            "summaryTable": summary_table,
            "aiCategory": ai_analysis["category"],
            "aiInsights": ai_analysis["insights"],
            "lineItems": line_items,  # 🔥 Now uses normalized line items!
            "notes": invoice.notes,
            "createdAt": invoice.created_at.isoformat() if invoice.created_at else None,
            "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
        }
    except Exception as e:
        logger.error(f"[Invoice Detail] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))