from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.database import get_db
from models.user_model import User
from utils.auth_utils import create_access_token, get_current_user
from pydantic import BaseModel
from passlib.hash import bcrypt

router = APIRouter()

class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register_user(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).filter(User.email == data.email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="User already exists")
    user = User(email=data.email)
    user.set_password(data.password)
    db.add(user)
    await db.commit()
    return {"status": "success", "email": data.email}

@router.post("/login")
async def login_user(
    email: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()

    if not user or not bcrypt.verify(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "model": user.preferred_model}

@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "email": user.email,
        "is_admin": user.is_admin,
        "preferred_model": user.preferred_model,
    }
