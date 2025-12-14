from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select
import os, shutil
from datetime import datetime

from models.invoice_model import Invoice
from models.vendor_model import Vendor
from models.database import get_db
from utils.auth_utils import get_current_user
from utils import logger
# ✅ Import from invoice_extractor, NOT langchain_agent
from services.invoice_extractor import extract_invoice_data



router = APIRouter(prefix="/invoices", tags=["Invoices"])

UPLOAD_DIR = "uploaded_invoices"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=dict)
async def upload_invoice(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Uploads an invoice file, extracts key details via AI, 
    and stores structured data in the database.
    """
    try:
        # ✅ Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"[Invoice Upload] Saved file: {file.filename}")

        # ✅ FIXED: Pass file_path directly to extraction function
        # The extraction function will handle text extraction internally
        extracted_data = extract_invoice_data(file_path)

        logger.info(f"[Invoice Upload] Extracted data: {extracted_data}")

        # ✅ Safe key access with defaults
        vendor_name = extracted_data.get("Vendor Name", "Unknown Vendor")
        vendor_address = extracted_data.get("Vendor Address", None)
        vendor_phone = extracted_data.get("Vendor Phone", None)
        vendor_email = extracted_data.get("Vendor Email", None)
        vendor_tax_id = extracted_data.get("Vendor Tax ID", None)
        
        invoice_number = extracted_data.get("Invoice or Order Number", "N/A")
        issue_date = extracted_data.get("Issue Date", None)
        due_date = extracted_data.get("Due Date", None)
        total_amount = float(extracted_data.get("Total Amount", 0.0) or 0.0)

        # ✅ Ensure vendor exists or update with new details
        result = await db.execute(select(Vendor).where(Vendor.name == vendor_name))
        vendor = result.scalars().first()

        if not vendor:
            # Create new vendor with all details
            vendor = Vendor(
                name=vendor_name,
                address=vendor_address,
                phone=vendor_phone,
                email=vendor_email,
                tax_id=vendor_tax_id
            )
            db.add(vendor)
            await db.commit()
            await db.refresh(vendor)
            logger.info(f"[Invoice Upload] Created new vendor: {vendor_name}")
        else:
            # Update existing vendor if we have new information
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
                logger.info(f"[Invoice Upload] Updated vendor details: {vendor_name}")

        # ✅ Parse dates safely
        parsed_issue_date = None
        if issue_date:
            try:
                parsed_issue_date = datetime.strptime(issue_date, "%Y-%m-%d").date()
            except ValueError:
                try:
                    # Try alternative format DD.MM.YYYY
                    parsed_issue_date = datetime.strptime(issue_date, "%d.%m.%Y").date()
                except ValueError:
                    logger.warning(f"[Invoice Upload] Could not parse issue_date: {issue_date}")

        parsed_due_date = None
        if due_date:
            try:
                parsed_due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
            except ValueError:
                try:
                    parsed_due_date = datetime.strptime(due_date, "%d.%m.%Y").date()
                except ValueError:
                    logger.warning(f"[Invoice Upload] Could not parse due_date: {due_date}")

        # ✅ Extract text for storage (optional - for reference only)
        import fitz
        text = ""
        try:
            doc = fitz.open(file_path)
            for page_num, page in enumerate(doc):
                page_text = page.get_text("text")
                text += f"\n\n=== PAGE {page_num+1} ===\n{page_text}"
            doc.close()
            
            # Clean up the text
            text = (
                text.replace("\x00", "")
                .replace("  ", " ")
                .replace("\n\n", "\n")
                .strip()
            )
        except Exception as text_error:
            logger.warning(f"[Invoice Upload] Could not extract text for storage: {text_error}")
            text = ""

        # ✅ Insert invoice safely
        new_invoice = Invoice(
            invoice_number=invoice_number,
            vendor_id=vendor.id,
            issue_date=parsed_issue_date,
            due_date=parsed_due_date,
            subtotal=float(extracted_data.get("Subtotal", 0.0) or 0.0),
            tax_amount=float(extracted_data.get("Tax Amount", 0.0) or 0.0),
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

        logger.success("[Invoice Upload] Successfully processed invoice.")
        return {
            "status": "success",
            "filename": file.filename,
            "vendor": vendor_name,
            "total_amount": total_amount,
            "invoice_id": str(new_invoice.id),
            "extracted": extracted_data
        }

    except Exception as e:
        logger.error(f"[Invoice Upload] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list", response_model=list)
async def list_invoices(db: AsyncSession = Depends(get_db)):
    """
    Fetch all invoices from the database with basic info.
    """
    try:
        result = await db.execute(select(Invoice))
        invoices = result.scalars().all()

        data = [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "vendor_id": str(inv.vendor_id),
                "total_amount": inv.total_amount,
                "status": inv.status,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            }
            for inv in invoices
        ]

        logger.info(f"[Invoice List] Retrieved {len(data)} invoices")
        return data

    except Exception as e:
        logger.error(f"[Invoice List] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))