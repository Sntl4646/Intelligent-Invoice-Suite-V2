from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from utils import logger

# Generic CRUD operations
class DBService:
    def __init__(self, model):
        self.model = model

    async def create(self, db: AsyncSession, obj_data: dict):
        try:
            obj = self.model(**obj_data)
            db.add(obj)
            await db.commit()
            await db.refresh(obj)
            logger.success(f"[DB] Created {self.model.__name__} record")
            return obj
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"[DB] Error creating {self.model.__name__}: {e}")
            raise

    async def get_all(self, db: AsyncSession, limit: int = 50):
        result = await db.execute(select(self.model).limit(limit))
        return result.scalars().all()

    async def get_by_id(self, db: AsyncSession, obj_id):
        result = await db.execute(select(self.model).filter_by(id=obj_id))
        return result.scalars().first()

    async def delete(self, db: AsyncSession, obj_id):
        obj = await self.get_by_id(db, obj_id)
        if obj:
            await db.delete(obj)
            await db.commit()
            logger.info(f"[DB] Deleted {self.model.__name__} {obj_id}")
            return True
        return False
