from fastapi import APIRouter, Depends, Body
from utils.auth_utils import get_current_user
from services.llm_engine import run_llm

router = APIRouter()

@router.post("/run")
async def run_custom_llm(
    payload: dict = Body(...),
    user=Depends(get_current_user)
):
    prompt = payload.get("prompt", "")
    if not prompt:
        return {"error": "Prompt required"}
    result = run_llm(prompt, model_choice=user.preferred_model)
    return {"prompt": prompt, "response": result, "model": user.preferred_model}


# ADD: Process invoice with AI
@router.post("/process/{invoice_id}", response_model=dict)
async def process_invoice_with_ai(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """Re-process an invoice with AI extraction."""
    try:
        from uuid import UUID
        from services.invoice_extractor import extract_invoice_data
        
        invoice_uuid = UUID(invoice_id)
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_uuid)
        )
        invoice = result.scalars().first()
        
        if not invoice or not invoice.filepath:
            raise HTTPException(status_code=404, detail="Invoice not found or no file")
        
        # Re-extract data
        extracted_data = extract_invoice_data(invoice.filepath)
        
        # Update invoice with new data
        invoice.extracteddata = extracted_data
        invoice.status = "processed"
        await db.commit()
        
        logger.info(f"AI Process: Re-processed invoice {invoice_id}")
        return {
            "success": True,
            "data": extracted_data
        }
        
    except Exception as e:
        logger.error(f"AI Process Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# MODIFY: Rename existing aiquery to match frontend
@router.post("/query", response_model=dict)
async def ai_sql_query(
    body: dict,
    user=Depends(get_current_user)
):
    """Execute AI-powered SQL query."""
    query = body.get("query", "")
    modelchoice = body.get("modelchoice", "gpt4")
    
    if not query:
        return {"error": "Query required"}
    
    logger.info(f"AI SQL Query: {query}")
    result = run_sql_query(query, modelchoice=modelchoice)
    return result
