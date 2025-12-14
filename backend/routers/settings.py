from fastapi import APIRouter, Depends, Request, HTTPException, Body
from models.database import get_db
from utils.auth_utils import get_current_user
from models.user_model import User
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/models")
async def update_model(
    data: dict = Body(..., example={"model": "gemini-1.5-pro"}),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    new_model = data.get("model")
    if not new_model:
        raise HTTPException(status_code=422, detail="Missing required field: 'model'")

    # ✅ Update user's preferred model
    user.preferred_model = new_model
    await db.commit()

    return {"status": "updated", "preferred_model": user.preferred_model}


@router.get("/models")
async def get_model(user: User = Depends(get_current_user)):
    return {"preferred_model": user.preferred_model or "default"}
