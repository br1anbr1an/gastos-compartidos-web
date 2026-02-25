from sqlalchemy.orm import Session
import models, schemas

# Categories
def get_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Category).filter(models.Category.active == True).offset(skip).limit(limit).all()

def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# Projects
def get_projects(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Project).offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def close_project(db: Session, project_id: int):
    from datetime import datetime
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project:
        project.closed_at = datetime.utcnow()
        project.status = "paid"
        db.commit()
        db.refresh(project)
    return project

# Expenses
def get_expenses(db: Session, project_id: int, skip: int = 0, limit: int = 100, user_id: int = None):
    query = db.query(models.Expense).filter(models.Expense.project_id == project_id)
    if user_id:
        query = query.filter(models.Expense.user_id == user_id)
    return query.offset(skip).limit(limit).all()



def create_expense(db: Session, expense: schemas.ExpenseCreate):
    db_expense = models.Expense(**expense.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

def delete_expense(db: Session, expense_id: int):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        return False
    
    # Check if project is closed
    project = db.query(models.Project).filter(models.Project.id == expense.project_id).first()
    if project.status == 'paid':
        return False  # Cannot delete expenses from closed projects
    
    db.delete(expense)
    db.commit()
    return True

# Users (Seed helper)
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserBase):
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
