from fastapi import FastAPI, Depends, HTTPException, Query, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta, datetime, UTC
from contextlib import asynccontextmanager
import asyncio
import json
import signal
import crud, models, schemas, auth
from database import engine, get_db

# Signal handling to break deadlocks during shutdown
FORCE_EXIT = False

def handle_sigint(sig, frame):
    global FORCE_EXIT
    FORCE_EXIT = True

# Install signal handler (only in main thread)
try:
    signal.signal(signal.SIGINT, handle_sigint)
except ValueError:
    # Not in main thread, skip (e.g. during some test setups)
    pass

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

shutdown_event = asyncio.Event()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.shutting_down = False
    shutdown_event.clear()
    # Startup seeding
    db = next(get_db())
    try:
        seed_categories(db)
    finally:
        db.close()
    yield
    # Shutdown
    app.state.shutting_down = True
    shutdown_event.set()

app = FastAPI(
    title="App Gastos Compartidos",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # Changed to False to allow "*" wildcard, as we use Bearer tokens
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
@app.get("/ledger/", response_model=List[schemas.ExpenseOut])
def read_expenses(
    project_id: int,
    skip: int = 0, 
    limit: int = 100, 
    user_id: int = 0, 
    db: Session = Depends(get_db)
):
    expenses = crud.get_expenses(db, project_id=project_id, skip=skip, limit=limit, user_id=user_id)
    return expenses

@app.post("/ledger/{expense_id}/reactions", response_model=Optional[schemas.Reaction])
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

@app.delete("/ledger/{expense_id}/reactions")
def remove_reaction(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    success = crud.delete_reaction(db, expense_id=expense_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Reaction not found")
    return {"success": True}

@app.patch("/ledger/{expense_id}", response_model=schemas.Expense)
def update_expense(
    expense_id: int,
    expense_update: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Security check: Does it belong to the user?
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if db_expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this expense")
    
    result = crud.update_expense(db, expense_id=expense_id, expense_update=expense_update)
    
    if result == "PROJECT_CLOSED":
        raise HTTPException(status_code=403, detail="Cannot edit expenses from closed projects")
    
    return result

@app.post("/ledger/", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Overwrite user_id with the authenticated user ID for safety
    expense.user_id = current_user.id
    return crud.create_expense(db=db, expense=expense)

@app.delete("/ledger/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    success = crud.delete_expense(db=db, expense_id=expense_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found or unable to delete")
    return {"success": True}


# --- SSE: Real-time expense updates ---
@app.get("/stream")
async def global_stream(
    request: Request,
    token: str = Query(...),
):
    """Server-Sent Events endpoint. Emite un evento cuando cualquier proyecto visible cambia."""
    try:
        user = auth.get_current_user_from_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    async def event_generator():
        from fastapi.concurrency import run_in_threadpool
        from sqlalchemy import func
        last_activity_at = None

        def fetch_max_activity():
            db = next(get_db())
            try:
                # Max activity of public projects OR private projects owned by user
                query = db.query(func.max(models.Project.last_activity_at)).filter(
                    (models.Project.is_private == False) | (models.Project.user_id == user.id)
                )
                return query.scalar()
            finally:
                db.close()

        heartbeat_counter = 0
        while not (shutdown_event.is_set() or FORCE_EXIT):
            if await request.is_disconnected():
                break

            try:
                current_max = await run_in_threadpool(fetch_max_activity)
                current_str = str(current_max) if current_max else None

                if last_activity_at is not None and current_str != last_activity_at:
                    payload = json.dumps({"updated_at": current_str})
                    yield f"data: {payload}\n\n"
                    heartbeat_counter = 0 # Reset on data
                else:
                    heartbeat_counter += 1
                    if heartbeat_counter >= 7: # Every ~21 seconds (7 * 3s approx)
                        yield ":ping\n\n"
                        heartbeat_counter = 0

                last_activity_at = current_str
            except Exception as e:
                yield f"event: error\ndata: {str(e)}\n\n"

            # Check for shutdown more frequently to remain responsive to SIGINT
            for _ in range(15): # 3 seconds total (15 * 0.2s)
                if shutdown_event.is_set() or FORCE_EXIT or await request.is_disconnected():
                    break
                await asyncio.sleep(0.2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
