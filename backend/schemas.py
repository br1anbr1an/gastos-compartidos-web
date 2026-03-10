from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

# Users
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Auth
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Projects
class ProjectCreate(BaseModel):
    name: str
    status: str = "in_progress"
    is_private: bool = False
    user_id: Optional[int] = None

class Project(BaseModel):
    id: int
    name: str
    status: str
    created_at: datetime
    closed_at: Optional[datetime] = None
    is_private: bool
    user_id: Optional[int] = None

    class Config:
        from_attributes = True

# Expenses
class ExpenseCreate(BaseModel):
    description: str
    amount: float
    category_id: int
    date: date
    user_id: Optional[int] = None
    project_id: int
    is_loan: bool = False

class Expense(BaseModel):
    id: int
    description: str
    amount: float
    category_id: int
    date: date
    user_id: int
    project_id: int
    is_loan: bool
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

# Reactions
class ReactionBase(BaseModel):
    emoji: str

class ReactionCreate(ReactionBase):
    pass

class Reaction(ReactionBase):
    id: int
    expense_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Updated Expense to include reactions
class ExpenseOut(Expense):
    reactions: list[Reaction] = []
    user_name: Optional[str] = None