import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os

# Add the parent directory to sys.path so we can import the backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set a dummy DATABASE_URL for tests to avoid Postgres connection attempts during module import
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from main import app
from database import get_db, Base
import crud
import schemas
from auth import get_password_hash

# 1. Setup Test Database (in-memory SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Override the database dependency
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Create the tables once for the entire test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Provide a transactional scope around a series of operations."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="module")
def client():
    """Return a FastAPI TestClient."""
    return TestClient(app)

@pytest.fixture(scope="function")
def test_user(db_session):
    """Create and return a test user."""
    user_in = schemas.UserCreate(
        name="Fixture User",
        email="fixture@example.com",
        password="fixturepassword"
    )
    # We call crud.create_user which hashes the password internally
    user = crud.create_user(db_session, user_in)
    return user

@pytest.fixture(scope="function")
def test_category(db_session):
    """Create and return a test category."""
    category_in = schemas.CategoryCreate(name="Test Category")
    category = crud.create_category(db_session, category_in)
    return category

@pytest.fixture(scope="function")
def test_project(db_session):
    """Create and return a test project."""
    project_in = schemas.ProjectCreate(name="Test Project", status="in_progress")
    project = crud.create_project(db_session, project_in)
    return project
