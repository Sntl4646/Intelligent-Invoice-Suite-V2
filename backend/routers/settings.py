from fastapi import APIRouter, Depends, Request, HTTPException, Body
from models.database import get_db
from utils.auth_utils import get_current_user
from models.user_model import User
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import JSONResponse
from utils import logger
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()


# ============= EXISTING MODEL ENDPOINTS (KEEP AS IS) =============

@router.post("/models")
async def update_model(
    data: dict = Body(..., example={"model": "gemini-1.5-pro"}),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update user's preferred LLM model."""
    new_model = data.get("model")
    if not new_model:
        raise HTTPException(status_code=422, detail="Missing required field: 'model'")

    # ✅ Update user's preferred model
    user.preferred_model = new_model
    await db.commit()
    
    logger.info(f"Settings: User {user.email} updated model to {new_model}")
    return {"status": "updated", "preferred_model": user.preferred_model}


@router.get("/models")
async def get_model(user: User = Depends(get_current_user)):
    """Get user's preferred LLM model."""
    return {"preferred_model": user.preferred_model or "gpt-4"}


# ============= NEW ENDPOINTS FOR FRONTEND SETTINGS PAGE =============

@router.get("/config")
async def get_all_settings(user: User = Depends(get_current_user)):
    """
    Get complete application configuration.
    Frontend Settings page expects this structure.
    """
    try:
        config = {
            # API Configuration
            "api": {
                "baseUrl": os.getenv("BACKEND_URL", "http://localhost:8000/api"),
                "apiKey": "***hidden***",  # Never expose actual keys
                "timeout": 60
            },
            
            # AI Processing Settings
            "ai": {
                "llmProvider": _get_provider_from_model(user.preferred_model),
                "preferredModel": user.preferred_model or "gpt-4",
                "visionModel": _get_vision_model(user.preferred_model),
                "autoProcess": True,  # Could be stored in user preferences
                "handwritingRecognition": True,
                "temperature": 0.1
            },
            
            # Notification Settings (mock for now - can be DB stored)
            "notifications": {
                "emailNotifications": True,
                "processingAlerts": True,
                "dueDateReminders": True,
                "webhookUrl": None
            },
            
            # Integration Settings
            "integrations": {
                "quickbooks": {"enabled": False, "connected": False},
                "xero": {"enabled": False, "connected": False},
                "sap": {"enabled": False, "connected": False},
                "slack": {"enabled": True, "connected": False}
            }
        }
        
        logger.info(f"Settings: Retrieved config for user {user.email}")
        return config
        
    except Exception as e:
        logger.error(f"Settings Config Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/config")
async def update_settings(
    settings: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update application settings.
    Frontend sends partial updates - merge with existing config.
    """
    try:
        updated_fields = []
        
        # Update AI settings if provided
        if "ai" in settings:
            ai_config = settings["ai"]
            
            if "preferredModel" in ai_config:
                user.preferred_model = ai_config["preferredModel"]
                updated_fields.append("preferredModel")
            
            # You can store other AI preferences in a JSON column or separate table
            # For now, we'll just acknowledge them
            if "autoProcess" in ai_config:
                updated_fields.append("autoProcess")
            if "handwritingRecognition" in ai_config:
                updated_fields.append("handwritingRecognition")
        
        # Update notification settings
        if "notifications" in settings:
            # Store in user preferences (you'd need a JSON column in User model)
            updated_fields.extend(settings["notifications"].keys())
        
        # Update integrations
        if "integrations" in settings:
            updated_fields.extend(settings["integrations"].keys())
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"Settings: Updated {updated_fields} for user {user.email}")
        
        return {
            "success": True,
            "message": f"Updated {len(updated_fields)} settings",
            "updatedFields": updated_fields,
            "preferredModel": user.preferred_model
        }
        
    except Exception as e:
        logger.error(f"Settings Update Error: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/integrations")
async def get_integrations(user: User = Depends(get_current_user)):
    """
    Get available third-party integrations and their status.
    Frontend Settings page displays these as connection cards.
    """
    integrations = [
        {
            "id": "quickbooks",
            "name": "QuickBooks",
            "description": "Sync invoices with QuickBooks Online",
            "icon": "QB",
            "connected": False,
            "enabled": True,
            "lastSync": None
        },
        {
            "id": "xero",
            "name": "Xero",
            "description": "Integrate with Xero accounting",
            "icon": "XE",
            "connected": False,
            "enabled": True,
            "lastSync": None
        },
        {
            "id": "sap",
            "name": "SAP",
            "description": "Connect to SAP ERP system",
            "icon": "SAP",
            "connected": False,
            "enabled": True,
            "lastSync": None
        },
        {
            "id": "slack",
            "name": "Slack",
            "description": "Get notifications in Slack",
            "icon": "SL",
            "connected": False,
            "enabled": True,
            "lastSync": None
        }
    ]
    
    return integrations


@router.post("/integrations/{integration_id}/connect")
async def connect_integration(
    integration_id: str,
    credentials: dict = Body(None),
    user: User = Depends(get_current_user)
):
    """
    Connect to a third-party integration.
    Frontend calls this when user clicks "Connect" button.
    """
    valid_integrations = ["quickbooks", "xero", "sap", "slack"]
    
    if integration_id not in valid_integrations:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    # Mock connection logic - implement actual OAuth/API key flows
    logger.info(f"Settings: User {user.email} connecting to {integration_id}")
    
    return {
        "success": True,
        "integration": integration_id,
        "connected": True,
        "message": f"Successfully connected to {integration_id.capitalize()}"
    }


@router.delete("/integrations/{integration_id}")
async def disconnect_integration(
    integration_id: str,
    user: User = Depends(get_current_user)
):
    """Disconnect from an integration."""
    logger.info(f"Settings: User {user.email} disconnecting from {integration_id}")
    
    return {
        "success": True,
        "integration": integration_id,
        "connected": False,
        "message": f"Disconnected from {integration_id.capitalize()}"
    }


@router.get("/api-keys")
async def get_api_keys(user: User = Depends(get_current_user)):
    """
    Get masked API keys for display.
    Frontend shows these in API Configuration section.
    """
    return {
        "openai": _mask_api_key(os.getenv("OPENAI_API_KEY")),
        "google": _mask_api_key(os.getenv("GOOGLE_API_KEY")),
        "databaseUrl": _mask_connection_string(os.getenv("DATABASE_URL"))
    }


@router.get("/available-models")
async def get_available_models(user: User = Depends(get_current_user)):
    """
    Get list of available LLM models for selection.
    Frontend uses this to populate model dropdown in Settings.
    """
    models = [
        {
            "id": "gpt-4-turbo",
            "name": "GPT-4 Turbo",
            "provider": "openai",
            "description": "Most capable OpenAI model",
            "supported": True
        },
        {
            "id": "gpt-4",
            "name": "GPT-4",
            "provider": "openai",
            "description": "Standard GPT-4 model",
            "supported": True
        },
        {
            "id": "gemini-1.5-flash",
            "name": "Gemini 1.5 Flash",
            "provider": "google",
            "description": "Fast and efficient Google model",
            "supported": True
        },
        {
            "id": "gemini-1.5-pro",
            "name": "Gemini 1.5 Pro",
            "provider": "google",
            "description": "Advanced Google Gemini model",
            "supported": True
        },
        {
            "id": "gemini-2.0-flash-exp",
            "name": "Gemini 2.0 Flash (Experimental)",
            "provider": "google",
            "description": "Latest experimental Gemini model",
            "supported": True
        },
        {
            "id": "claude-3-opus",
            "name": "Claude 3 Opus",
            "provider": "anthropic",
            "description": "Most capable Anthropic model",
            "supported": False
        },
        {
            "id": "claude-3-sonnet",
            "name": "Claude 3 Sonnet",
            "provider": "anthropic",
            "description": "Balanced Anthropic model",
            "supported": False
        }
    ]
    
    return {
        "models": models,
        "current": user.preferred_model or "gpt-4"
    }


# ============= HELPER FUNCTIONS =============

def _get_provider_from_model(model: str) -> str:
    """Determine provider from model name."""
    if not model:
        return "openai"
    
    model_lower = model.lower()
    if "gpt" in model_lower:
        return "openai"
    elif "gemini" in model_lower:
        return "google"
    elif "claude" in model_lower:
        return "anthropic"
    else:
        return "local"


def _get_vision_model(model: str) -> str:
    """Get corresponding vision model."""
    provider = _get_provider_from_model(model)
    
    vision_models = {
        "openai": "gpt-4-vision",
        "google": "gemini-pro-vision",
        "anthropic": "claude-3-vision"
    }
    
    return vision_models.get(provider, "gpt-4-vision")


def _mask_api_key(key: str) -> str:
    """Mask API key for secure display."""
    if not key:
        return "Not configured"
    
    if len(key) <= 8:
        return "***"
    
    return f"{key[:4]}...{key[-4:]}"


def _mask_connection_string(conn_str: str) -> str:
    """Mask database connection string."""
    if not conn_str:
        return "Not configured"
    
    # Hide password in connection string
    import re
    masked = re.sub(r'://([^:]+):([^@]+)@', r'://\1:***@', conn_str)
    return masked
