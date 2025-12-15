from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from models.database import get_db
from services.langchain_agent import run_sql_query
from utils.auth_utils import get_current_user
from utils import logger

router = APIRouter()

@router.get("/summary")
async def dashboard_summary(
    period: str = Query("month", regex="^(month|quarter|year)$"),
    db: AsyncSession = Depends(get_db),
):
    date_trunc = "month" if period == "month" else "quarter" if period == "quarter" else "year"
    q = text(f"""
        SELECT DATE_TRUNC('{date_trunc}', issue_date) AS period,
               COUNT(*) AS invoice_count,
               SUM(total_amount) AS total_spend,
               AVG(total_amount) AS avg_invoice
        FROM invoices
        GROUP BY period
        ORDER BY period;
    """)
    rows = (await db.execute(q)).all()
    data = [
        {"period": str(r.period), "invoice_count": r.invoice_count,
         "total_spend": float(r.total_spend or 0), "avg_invoice": float(r.avg_invoice or 0)}
        for r in rows
    ]
    return {"period": period, "data": data}

@router.post("/ai/query")
async def ai_sql_query(body: dict, user=Depends(get_current_user)):
    query = body.get("query", "")
    if not query:
        return {"error": "Query required"}
    logger.info(f"AI SQL Query: {query}")
    result = run_sql_query(query, model_choice=user.preferred_model)
    return result

from typing import Optional

# MODIFY: Update summary to match frontend expectations
@router.get("/summary", response_model=dict)
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get dashboard summary metrics."""
    try:
        # Total invoices
        total_result = await db.execute(select(Invoice))
        all_invoices = total_result.scalars().all()
        
        # Status counts
        processed = len([i for i in all_invoices if i.status in ['processed', 'approved', 'paid']])
        pending = len([i for i in all_invoices if i.status == 'pending'])
        
        # Total vendors
        vendor_result = await db.execute(select(Vendor))
        total_vendors = len(vendor_result.scalars().all())
        
        # Total amount
        total_amount = sum(inv.totalamount or 0 for inv in all_invoices)
        
        data = {
            "totalInvoices": len(all_invoices),
            "totalProcessed": processed,
            "totalPending": pending,
            "totalVendors": total_vendors,
            "totalAmount": float(total_amount),
            "avgProcessingTime": 2.5,  # Mock for now
            "successRate": 98.5,  # Mock for now
        }
        
        logger.info(f"Dashboard Summary: {data}")
        return data
        
    except Exception as e:
        logger.error(f"Dashboard Summary Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ADD: Invoice chart data with period filtering
@router.get("/invoices", response_model=list)
async def get_invoice_chart_data(
    period: str = Query("monthly", regex="^(monthly|quarterly|yearly)$"),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get invoice volume and amount data for charts."""
    try:
        # Map period to SQL date truncation
        datetrunc = {
            "monthly": "month",
            "quarterly": "quarter",
            "yearly": "year"
        }[period]
        
        q = text(f"""
            SELECT 
                DATE_TRUNC('{datetrunc}', issuedate) AS period,
                COUNT(*) AS invoice_count,
                SUM(totalamount) AS total_amount
            FROM invoices
            WHERE issuedate IS NOT NULL
            GROUP BY period
            ORDER BY period DESC
            LIMIT 12
        """)
        
        rows = (await db.execute(q)).all()
        
        data = [{
            "name": row.period.strftime("%b %Y") if datetrunc == "month" else str(row.period),
            "value": row.invoice_count,
            "amount": float(row.total_amount or 0)
        } for row in reversed(rows)]
        
        logger.info(f"Invoice Chart: Retrieved {len(data)} data points for {period}")
        return data
        
    except Exception as e:
        logger.error(f"Invoice Chart Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ADD: Vendor spend chart data
@router.get("/vendor-spend", response_model=list)
async def get_vendor_spend_data(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get top vendors by total spend."""
    try:
        q = text("""
            SELECT 
                v.name,
                SUM(i.totalamount) AS total_spend
            FROM vendors v
            JOIN invoices i ON i.vendorid = v.id
            GROUP BY v.name
            ORDER BY total_spend DESC
            LIMIT 5
        """)
        
        rows = (await db.execute(q)).all()
        
        data = [{
            "name": row.name,
            "value": float(row.total_spend or 0)
        } for row in rows]
        
        logger.info(f"Vendor Spend: Retrieved {len(data)} vendors")
        return data
        
    except Exception as e:
        logger.error(f"Vendor Spend Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ADD: Invoice status distribution
@router.get("/invoice-status", response_model=list)
async def get_invoice_status_data(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get invoice count by status."""
    try:
        result = await db.execute(select(Invoice))
        invoices = result.scalars().all()
        
        # Count by status
        status_counts = {}
        for inv in invoices:
            status = inv.status.capitalize()
            status_counts[status] = status_counts.get(status, 0) + 1
        
        data = [{
            "name": status,
            "value": count
        } for status, count in status_counts.items()]
        
        logger.info(f"Invoice Status: {data}")
        return data
        
    except Exception as e:
        logger.error(f"Invoice Status Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ADD: Source type distribution
@router.get("/source-types", response_model=list)
async def get_source_type_data(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get invoice count by source type."""
    try:
        # Mock data - you'll need to add sourceType column to Invoice model
        data = [
            {"name": "PDF", "value": 45},
            {"name": "Email", "value": 23},
            {"name": "Image", "value": 18},
            {"name": "Handwritten", "value": 14}
        ]
        
        logger.info(f"Source Types: {data}")
        return data
        
    except Exception as e:
        logger.error(f"Source Types Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
