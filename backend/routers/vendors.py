from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.vendor_model import Vendor
from models.database import get_db
from utils.auth_utils import get_current_user
from utils import logger

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
