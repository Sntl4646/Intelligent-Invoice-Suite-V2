import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection URL
DATABASE_URL = os.getenv("DATABASE_URL")

# Ensure the URL is loaded
if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL is not set in .env file")

# Create async engine and session
engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Base class for models
Base = declarative_base()

# Dependency for FastAPI routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """
    Create all tables defined in models.* only if they don't exist.
    This prevents data loss on every restart.
    """
    from models import user_model, invoice_model, vendor_model  # ✅ ensure correct filenames

    async with engine.begin() as conn:
        print("🛠️ Checking and creating missing database tables (safe mode)...")
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database initialization complete. No data was deleted.")



