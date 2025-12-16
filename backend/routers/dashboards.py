from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from models.database import get_db
from services.langchain_agent import run_sql_query
from utils import logger

router = APIRouter()

@router.get("/summary")  # ✅ Fixed: removed ${API_BASE_URL}/dashboard/
async def dashboard_summary(
    period: str = Query("month", regex="^(month|quarter|year)$"),
    db: AsyncSession = Depends(get_db),
    # ✅ No auth required (consistent with invoices/vendors)
):
    """
    Get dashboard summary statistics for invoices.
    Supports monthly, quarterly, or yearly aggregation.
    """
    try:
        date_trunc = "month" if period == "month" else "quarter" if period == "quarter" else "year"
        
        q = text(f"""
            SELECT DATE_TRUNC('{date_trunc}', issue_date) AS period,
                   COUNT(*) AS invoice_count,
                   SUM(total_amount) AS total_spend,
                   AVG(total_amount) AS avg_invoice
            FROM invoices
            WHERE issue_date IS NOT NULL
            GROUP BY period
            ORDER BY period DESC;
        """)
        
        rows = (await db.execute(q)).all()
        
        data = [
            {
                "period": str(r.period) if r.period else None,
                "invoice_count": r.invoice_count,
                "total_spend": float(r.total_spend or 0),
                "avg_invoice": float(r.avg_invoice or 0)
            }
            for r in rows
        ]
        
        logger.info(f"[Dashboard] Retrieved summary for period: {period}, {len(data)} records")
        return {"period": period, "data": data}
        
    except Exception as e:
        logger.error(f"[Dashboard] Summary error: {e}")
        return {"period": period, "data": [], "error": str(e)}


@router.post("/ai/query")  # ✅ Fixed: removed ${API_BASE_URL}/dashboard/
async def ai_sql_query(
    body: dict,
    db: AsyncSession = Depends(get_db),
    # ✅ Removed auth requirement for consistency
):
    """
    Execute natural language queries against the invoice database using AI.
    """
    try:
        query = body.get("query", "")
        if not query:
            return {"error": "Query required"}
        
        logger.info(f"[Dashboard] AI SQL Query: {query}")
        
        # Use default model if user doesn't have preference
        model_choice = body.get("model", "gpt-4o-mini")
        result = run_sql_query(query, model_choice=model_choice)
        
        return result
        
    except Exception as e:
        logger.error(f"[Dashboard] AI Query error: {e}")
        return {"error": str(e)}