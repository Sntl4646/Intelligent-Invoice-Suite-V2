#This file defines the invoice_model.py for the invoicing system.
from sqlalchemy import Column, String, Date, Float, ForeignKey, DateTime, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"))
    issue_date = Column(Date)
    due_date = Column(Date)
    subtotal = Column(Float)
    tax_amount = Column(Float)
    total_amount = Column(Float)
    payment_terms = Column(String)
    notes = Column(String)
    status = Column(String, default="pending")
    raw_text = Column(String)
    extracted_data = Column(JSON)
    file_path = Column()
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vendor = relationship("Vendor", backref="invoices")
