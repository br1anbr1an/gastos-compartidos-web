from sqlalchemy.orm import Session
import models, schemas
import auth

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
    from datetime import date, datetime, UTC
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project:
        project.closed_at = datetime.now(UTC)
        project.status = "paid"
        db.commit()
        db.refresh(project)
    return project

# Expenses
def get_expenses(db: Session, project_id: int, skip: int = 0, limit: int = 100, user_id: int = 0):
    query = db.query(models.Expense).filter(models.Expense.project_id == project_id)
    if user_id > 0:
        query = query.filter(models.Expense.user_id == user_id)
    
    expenses = query.offset(skip).limit(limit).all()
    
    # Enrich with user_name for the schema
    for exp in expenses:
        if exp.user:
            exp.user_name = exp.user.name
        else:
            exp.user_name = "Unknown"
    
    return expenses



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

# Reactions
def upsert_reaction(db: Session, expense_id: int, user_id: int, emoji: str):
    # Check if reaction exists
    db_reaction = db.query(models.ExpenseReaction).filter(
        models.ExpenseReaction.expense_id == expense_id,
        models.ExpenseReaction.user_id == user_id
    ).first()
    
    if db_reaction:
        if db_reaction.emoji == emoji:
            # If same emoji, remove it (toggle off)
            db.delete(db_reaction)
            db.commit()
            return None
        else:
            # Update emoji
            db_reaction.emoji = emoji
            db.commit()
            db.refresh(db_reaction)
            return db_reaction
    else:
        # Create new
        db_reaction = models.ExpenseReaction(
            expense_id=expense_id,
            user_id=user_id,
            emoji=emoji
        )
        db.add(db_reaction)
        db.commit()
        db.refresh(db_reaction)
        return db_reaction

def delete_reaction(db: Session, expense_id: int, user_id: int):
    db_reaction = db.query(models.ExpenseReaction).filter(
        models.ExpenseReaction.expense_id == expense_id,
        models.ExpenseReaction.user_id == user_id
    ).first()
    if db_reaction:
        db.delete(db_reaction)
        db.commit()
        return True
    return False

# Users (Seed helper)
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not auth.verify_password(password, user.password_hash):
        return False
    return user
