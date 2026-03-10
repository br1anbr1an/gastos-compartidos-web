from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta, datetime, UTC
from contextlib import asynccontextmanager
import crud, models, schemas, auth
from database import engine, get_db

# Create tables (Handled by Alembic migrations)
# models.Base.metadata.create_all(bind=engine)

def seed_categories(db: Session):
    categories_to_seed = [
        "Despensa", "Restaurantes", "Michis", "Transporte", 
        "Mantenimiento Auto", "Mantenimiento Casa", "Salud", 
        "Regalos", "Gasolina", "Servicios", "Otros"
    ]
    existing = db.query(models.Category.name).all()
    existing_names = [name[0] for name in existing]
    
    for cat_name in categories_to_seed:
        if cat_name not in existing_names:
            new_cat = models.Category(name=cat_name, active=True)
            db.add(new_cat)
    db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup seeding
    db = next(get_db())
    try:
        seed_categories(db)
    finally:
        db.close()
    yield

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth & Users ---
@app.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users/", response_model=List[schemas.User])
def read_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.User).all()

# --- Categories ---
@app.get("/categories/", response_model=List[schemas.Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    categories = crud.get_categories(db, skip=skip, limit=limit)
    return categories

# --- Projects ---
@app.get("/projects/", response_model=List[schemas.Project])
def read_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    projects = crud.get_projects(db, skip=skip, limit=limit)
    return projects

@app.post("/projects/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return crud.create_project(db=db, project=project)

@app.patch("/projects/{project_id}/close", response_model=schemas.Project)
def close_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    project = crud.close_project(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# --- Expenses ---
@app.get("/expenses/", response_model=List[schemas.ExpenseOut])
def read_expenses(
    project_id: int,
    skip: int = 0, 
    limit: int = 100, 
    user_id: int = 0, 
    db: Session = Depends(get_db)
):
    expenses = crud.get_expenses(db, project_id=project_id, skip=skip, limit=limit, user_id=user_id)
    return expenses

@app.post("/expenses/{expense_id}/reactions", response_model=Optional[schemas.Reaction])
def create_or_update_reaction(
    expense_id: int,
    reaction: schemas.ReactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Check if expense exists
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return crud.upsert_reaction(db, expense_id=expense_id, user_id=current_user.id, emoji=reaction.emoji)

@app.delete("/expenses/{expense_id}/reactions")
def remove_reaction(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    success = crud.delete_reaction(db, expense_id=expense_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Reaction not found")
    return {"success": True}

@app.post("/expenses/", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Overwrite user_id with the authenticated user ID for safety
    expense.user_id = current_user.id
    return crud.create_expense(db=db, expense=expense)

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    success = crud.delete_expense(db=db, expense_id=expense_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found or unable to delete")
    return {"success": True}


