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
