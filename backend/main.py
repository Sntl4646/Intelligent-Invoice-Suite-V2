from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import invoices, vendors, dashboards, auth, llm_handler, settings
from models.database import init_db
from utils import logger
from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager


# ==========================================================
# 🌱 Load Environment Configuration
# ==========================================================
load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
logger.info(f"🌍 Running in {ENVIRONMENT.upper()} mode")

# Optional: show masked DB connection info
db_url = os.getenv("DATABASE_URL", "not-set")
if "@" in db_url:
    logger.info(f"📦 Database host: {db_url.split('@')[-1].split('/')[0]}")
else:
    logger.info("📦 Database URL loaded (masked)")


# ==========================================================
# 🔁 Application Lifecycle (modern FastAPI lifespan pattern)
# ==========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup and shutdown events."""
    try:
        logger.info("🚀 Initializing database tables...")
        await init_db()
        logger.success("✅ Database initialization complete. No data was deleted.")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
    yield
    logger.info("🧹 Application shutdown complete.")


# ==========================================================
# ⚙️ FastAPI App Initialization
# ==========================================================
app = FastAPI(
    title="Intelligent Invoice Suite API",
    description="Backend API for Intelligent Invoice Suite (FastAPI + SQLAlchemy + AI Extractor)",
    version="1.1.0",
    lifespan=lifespan,
)


# ==========================================================
# 🔓 CORS Configuration (Frontend Integration)
# ==========================================================
origins = [
    "http://localhost:8080",   # React dev server
    "http://127.0.0.1:8080",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# 🔗 Router Registrations (API Prefixes)
# ==========================================================
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(vendors.router, prefix="/api/vendors", tags=["Vendors"])
app.include_router(dashboards.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(llm_handler.router, prefix="/api/ai", tags=["AI"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])


# ==========================================================
# 🌐 Core Endpoints
# ==========================================================
@app.get("/")
async def root():
    """Basic health check endpoint."""
    return {
        "status": "ok",
        "environment": ENVIRONMENT,
        "message": "Invoice Assistant API is live and ready."
    }


@app.get("/api/health")
async def health_check():
    """Lightweight API health monitor."""
    return {"status": "healthy", "service": "Invoice Assistant", "environment": ENVIRONMENT}


# ==========================================================
# 🧭 Run with: uvicorn backend.main:app --reload
# ==========================================================
