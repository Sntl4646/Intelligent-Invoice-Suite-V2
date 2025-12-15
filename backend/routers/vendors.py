from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.vendor_model import Vendor
from models.database import get_db
from utils.auth_utils import get_current_user
from utils import logger
from uuid import UUID

router = APIRouter()

@router.get("/list", response_model=list)
async def list_vendors(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Lists all vendors in the system.
    """
    try:
        result = await db.execute(select(Vendor))
        vendors = result.scalars().all()

        data = [
            {
                "id": str(v.id),
                "name": v.name,
                "address": v.address,
                "phone": v.phone,
                "email": v.email,
                "tax_id": v.tax_id,
                "created_at": v.created_at.isoformat() if v.created_at else None
            }
            for v in vendors
        ]

        logger.info(f"[Vendors] Retrieved {len(data)} vendors")
        return data

    except Exception as e:
        logger.error(f"[Vendors] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ADD: Get single vendor by ID
@router.get("/{vendor_id}", response_model=dict)
async def get_vendor(
    vendor_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get detailed vendor information by ID."""
    try:
        vendor_uuid = UUID(vendor_id)
        result = await db.execute(
            select(Vendor).where(Vendor.id == vendor_uuid)
        )
        vendor = result.scalars().first()
        
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        
        # Get vendor statistics
        invoice_result = await db.execute(
            select(Invoice).where(Invoice.vendorid == vendor_uuid)
        )
        invoices = invoice_result.scalars().all()
        
        total_spend = sum(inv.totalamount or 0 for inv in invoices)
        total_invoices = len(invoices)
        
        data = {
            "id": str(vendor.id),
            "name": vendor.name,
            "address": vendor.address,
            "phone": vendor.phone,
            "email": vendor.email,
            "taxId": vendor.taxid,
            "totalInvoices": total_invoices,
            "totalSpend": float(total_spend),
            "status": "active",
            "createdAt": vendor.createdat.isoformat() if vendor.createdat else None
        }
        
        logger.info(f"Vendor Detail: Retrieved vendor {vendor_id}")
        return data
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid vendor ID format")
    except Exception as e:
        logger.error(f"Vendor Detail Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ADD: Get all invoices for a specific vendor
@router.get("/{vendor_id}/invoices", response_model=list)
async def get_vendor_invoices(
    vendor_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get all invoices for a specific vendor."""
    try:
        from sqlalchemy.orm import selectinload
        vendor_uuid = UUID(vendor_id)
        
        result = await db.execute(
            select(Invoice)
            .options(selectinload(Invoice.vendor))
            .where(Invoice.vendorid == vendor_uuid)
            .order_by(Invoice.createdat.desc())
        )
        invoices = result.scalars().all()
        
        data = [{
            "id": str(inv.id),
            "invoiceNumber": inv.invoicenumber,
            "vendorId": str(inv.vendorid),
            "vendorName": inv.vendor.name if inv.vendor else "Unknown",
            "issueDate": inv.issuedate.isoformat() if inv.issuedate else None,
            "dueDate": inv.duedate.isoformat() if inv.duedate else None,
            "totalAmount": float(inv.totalamount) if inv.totalamount else 0.0,
            "status": inv.status,
            "createdAt": inv.createdat.isoformat() if inv.createdat else None,
        } for inv in invoices]
        
        logger.info(f"Vendor Invoices: Retrieved {len(data)} invoices for vendor {vendor_id}")
        return data
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid vendor ID format")
    except Exception as e:
        logger.error(f"Vendor Invoices Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
