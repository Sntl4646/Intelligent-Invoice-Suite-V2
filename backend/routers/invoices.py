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
import openai
from uuid import UUID
import ssl
import certifi
import urllib3

router = APIRouter()

# Disable SSL warnings from urllib3
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


def analyze_invoice_text(text: str):
    """Use LLM to analyze invoice text and infer category + insights (with SSL verification disabled)."""
    if not text.strip():
        return {"category": "Unknown", "insights": "No text available for AI analysis."}

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"category": "General", "insights": "AI not configured, returning placeholder data."}

    openai.api_key = api_key

    # ⚠️ Disable SSL verification (for corporate proxy / self-signed certs)
    openai.verify_ssl_certs = False

    prompt = f"""
    You are an expert AI trained to understand business invoices.
    Based on the following invoice text, identify:
    1. The most likely category of expense (like 'Office Supplies', 'Consulting', 'Utilities', 'Software', etc.)
    2. A short summary or insight about it.

    Respond strictly in JSON:
    {{
        "category": "string",
        "insights": "string"
    }}

    --- INVOICE TEXT ---
    {text[:2000]}
    """

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=250
        )
        content = response.choices[0].message["content"]
        try:
            data = json.loads(content)
        except Exception:
            data = {"category": "Uncategorized", "insights": content.strip()[:500]}
        return data
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"category": "Uncategorized", "insights": f"AI analysis failed: {e}"}




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
    """Get a single invoice by ID with details, summary, and AI insights."""
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
        ai_analysis = analyze_invoice_text(invoice.raw_text or "")

        # Build line items (if any)
        line_items = []
        if isinstance(extracted_data.get("Line Items"), list):
            for idx, item in enumerate(extracted_data["Line Items"]):
                line_items.append({
                    "id": str(idx),
                    "description": str(item.get("Description") or item.get("Item") or ""),
                    "quantity": safe_float(item.get("Quantity")),
                    "unitPrice": safe_float(item.get("Unit Price")),
                    "total": safe_float(item.get("Amount")),
                })

        return {
            "id": str(invoice.id),
            "invoiceNumber": invoice.invoice_number,
            "vendorName": invoice.vendor.name if invoice.vendor else "Unknown",
            "total": safe_float(invoice.total_amount),
            "status": invoice.status,
            "summaryTable": summary_table,
            "aiCategory": ai_analysis["category"],
            "aiInsights": ai_analysis["insights"],
            "lineItems": line_items,
        }
    except Exception as e:
        logger.error(f"[Invoice Detail] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
