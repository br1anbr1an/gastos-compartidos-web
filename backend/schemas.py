from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

# Users
class UserBase(BaseModel):
    name: str
    email: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Projects
class ProjectCreate(BaseModel):
    name: str
    status: str = "in_progress"

class Project(BaseModel):
    id: int
    name: str
    status: str
    created_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Expenses
class ExpenseCreate(BaseModel):
    description: str
    amount: float
    category_id: int
    date: date
    user_id: int
    project_id: int

class Expense(BaseModel):
    id: int
    description: str
    amount: float
    category_id: int
    date: date
    user_id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CategoryCreate(BaseModel):
    name: str

class Category(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True