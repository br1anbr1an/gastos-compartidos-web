from sqlalchemy import Column, String, ForeignKey, Date, DECIMAL, Text, TIMESTAMP, Integer, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False) # 'in_progress', 'paid'
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    closed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    last_activity_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    is_private = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, default=0)
    user = relationship("User")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(Text, nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    date = Column(Date, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    is_loan = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    user = relationship("User")
    reactions = relationship("ExpenseReaction", back_populates="expense", cascade="all, delete-orphan")
    items = relationship("ExpenseItem", back_populates="expense", cascade="all, delete-orphan")

class ExpenseReaction(Base):
    __tablename__ = "expense_reactions"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    emoji = Column(String(10), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    expense = relationship("Expense", back_populates="reactions")
    user = relationship("User")

class ExpenseItem(Base):
    __tablename__ = "expense_items"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    
    expense = relationship("Expense", back_populates="items")
