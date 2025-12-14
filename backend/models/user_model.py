from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from passlib.hash import bcrypt
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    preferred_model = Column(String, default="gpt4")
    is_admin = Column(Boolean, default=False)

    def verify_password(self, password: str) -> bool:
        try:
            return bcrypt.verify(password[:72], self.password_hash)
        except Exception:
            return False

    def set_password(self, password: str):
        # bcrypt accepts max 72 bytes; ensure safe encoding
        password_bytes = password.encode("utf-8")[:72]
        self.password_hash = bcrypt.hash(password_bytes)
