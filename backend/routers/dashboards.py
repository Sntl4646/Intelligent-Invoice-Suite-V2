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
