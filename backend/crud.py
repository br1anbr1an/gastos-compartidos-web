from sqlalchemy.orm import Session
import models, schemas
import auth

def touch_project(db: Session, project_id: int):
    """Bumps last_activity_at on the project to trigger SSE streams."""
    from sqlalchemy import update, func
    db.execute(update(models.Project).where(models.Project.id == project_id).values(last_activity_at=func.now()))

def touch_project_by_expense(db: Session, expense_id: int):
    expense = db.query(models.Expense.project_id).filter(models.Expense.id == expense_id).first()
    if expense:
        touch_project(db, expense[0])

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
def get_projects(db: Session, skip: int = 0, limit: int = 100, include_archived: bool = False):
    query = db.query(models.Project)
    if not include_archived:
        query = query.filter(models.Project.is_archived == False)
    return query.offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def close_project(db: Session, project_id: int):
    from datetime import datetime, UTC
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project:
        project.closed_at = datetime.now(UTC)
        project.status = "paid"
        touch_project(db, project_id)
        db.commit()
        db.refresh(project)
    return project

def archive_project(db: Session, project_id: int):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project and project.status == "paid":
        project.is_archived = True
        touch_project(db, project_id)
        db.commit()
        db.refresh(project)
        return project
    return None

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
    expense_data = expense.model_dump()
    items_data = expense_data.pop("items", []) or []
    
    db_expense = models.Expense(**expense_data)
    db.add(db_expense)
    touch_project(db, db_expense.project_id)
    db.commit()
    db.refresh(db_expense)
    
    for item in items_data:
        db_item = models.ExpenseItem(**item, expense_id=db_expense.id)
        db.add(db_item)
    
    if items_data:
        db.commit()
        db.refresh(db_expense)
        
    return db_expense

def update_expense(db: Session, expense_id: int, expense_update: schemas.ExpenseUpdate):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        return None
    
    # Check if project is closed
    project = db.query(models.Project).filter(models.Project.id == db_expense.project_id).first()
    if project.status == 'paid':
        return "PROJECT_CLOSED"
    
    # Update fields
    update_data = expense_update.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)
    
    for key, value in update_data.items():
        setattr(db_expense, key, value)
    
    # Update Items if provided
    if items_data is not None:
        # Simplest sync: Delete all and recreate
        db.query(models.ExpenseItem).filter(models.ExpenseItem.expense_id == expense_id).delete()
        for item in items_data:
            db_item = models.ExpenseItem(**item, expense_id=expense_id)
            db.add(db_item)
    
    touch_project(db, db_expense.project_id)
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
    touch_project(db, expense.project_id)
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
            touch_project_by_expense(db, expense_id)
            db.commit()
            return None
        else:
            # Update emoji
            db_reaction.emoji = emoji
            touch_project_by_expense(db, expense_id)
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
        touch_project_by_expense(db, expense_id)
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
        touch_project_by_expense(db, expense_id)
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
