from datetime import datetime, timezone
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, create_engine, Session

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class OrderStatus(str, Enum):
    DRAFT = "DRAFT"
    CREATED = "CREATED"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class OrderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True)
    sku: str = Field(index=True)
    title: str
    unit_price: float
    quantity: int
    total_price: float

    order: Optional["Order"] = Relationship(back_populates="items")

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_order_ref: str = Field(unique=True, index=True)
    paypal_order_id: Optional[str] = Field(default=None, unique=True, index=True)
    paypal_capture_id: Optional[str] = Field(default=None, index=True)
    status: OrderStatus = Field(default=OrderStatus.DRAFT, index=True)
    currency: str = Field(default="USD")
    subtotal: float
    shipping: float
    tax: float
    total_amount: float
    customer_notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    items: List[OrderItem] = Relationship(back_populates="order")

class WebhookEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: str = Field(unique=True, index=True)
    event_type: str = Field(index=True)
    resource_id: Optional[str] = Field(default=None, index=True)
    status: str
    received_at: datetime = Field(default_factory=utc_now)
    payload_json: str

# Database setup
import os
DB_PATH = os.path.join(os.path.dirname(__file__), "fieldsense_orders.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
