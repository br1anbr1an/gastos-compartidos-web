import pytest
from conftest import TestingSessionLocal
import crud
import schemas

@pytest.fixture(scope="module")
def setup_category():
    db = TestingSessionLocal()
    cat_in = schemas.CategoryCreate(name="API Category")
    cat = crud.create_category(db, cat_in)
    db.close()
    return cat.id

@pytest.fixture(scope="module")
def user_token(client):
    """Fixture to register a user and get an auth token for the client tests."""
    # Register a new user
    client.post(
        "/users/",
        json={"name": "API User", "email": "apiuser@test.com", "password": "secure123"}
    )
    # Login to get token
    response = client.post(
        "/token",
        data={"username": "apiuser@test.com", "password": "secure123"}
    )
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(user_token):
    """Fixture to provide the authorization headers for protected endpoints."""
    return {"Authorization": f"Bearer {user_token}"}

# ==== CATEGORIES ====

def test_read_categories(client, auth_headers):
    # First create a category via DB (no endpoint for creating one yet, so it relies on the db fixture or initial data)
    # Actually, we can test that the endpoint responds and auth works
    response = client.get("/categories/", headers=auth_headers)
    assert response.status_code == 200
    assert type(response.json()) == list

# ==== PROJECTS ====

def test_create_project(client, auth_headers):
    response = client.post(
        "/projects/",
        headers=auth_headers,
        json={"name": "Groceries Project", "status": "in_progress"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Groceries Project"
    assert data["status"] == "in_progress"
    assert "id" in data
    
def test_read_projects(client, auth_headers):
    response = client.get("/projects/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert type(data) == list
    assert len(data) >= 1

def test_close_project(client, auth_headers):
    # 1. Create it first
    create_resp = client.post(
        "/projects/",
        headers=auth_headers,
        json={"name": "To Close", "status": "in_progress"}
    )
    project_id = create_resp.json()["id"]
    
    # 2. Close it
    close_resp = client.patch(f"/projects/{project_id}/close", headers=auth_headers)
    assert close_resp.status_code == 200
    data = close_resp.json()
    assert data["status"] == "paid"
    assert data["closed_at"] is not None

# ==== EXPENSES ====

def test_create_expense(client, auth_headers, setup_category):
    # 1. Create a project
    project_resp = client.post("/projects/", headers=auth_headers, json={"name": "Exp Project", "status": "in_progress"})
    project_id = project_resp.json()["id"]
    
    expense_data = {
        "description": "Lunch",
        "amount": 15.50,
        "date": "2023-10-01",
        "project_id": project_id,
        "category_id": setup_category
    }
    
    response = client.post(
        "/ledger/",
        headers=auth_headers,
        json=expense_data
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Lunch"
    assert data["amount"] == 15.50
    # User ID should match the token automatically
    assert data["user_id"] is not None

def test_read_expenses(client, auth_headers, setup_category):
    # Create project and expense
    project_resp = client.post("/projects/", headers=auth_headers, json={"name": "Read Exp Project", "status": "in_progress"})
    project_id = project_resp.json()["id"]
    
    client.post(
        "/ledger/",
        headers=auth_headers,
        json={"description": "Gas", "amount": 40.00, "date": "2023-10-01", "project_id": project_id, "category_id": setup_category}
    )
    
    # Read expenses for project
    response = client.get(f"/ledger/?project_id={project_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["description"] == "Gas"

def test_delete_expense(client, auth_headers, setup_category):
    project_resp = client.post("/projects/", headers=auth_headers, json={"name": "Delete Exp Project", "status": "in_progress"})
    project_id = project_resp.json()["id"]
    
    exp_resp = client.post(
        "/ledger/",
        headers=auth_headers,
        json={"description": "To be deleted", "amount": 5.00, "date": "2023-10-01", "project_id": project_id, "category_id": setup_category}
    )
    expense_id = exp_resp.json()["id"]
    
    response = client.delete(f"/ledger/{expense_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {"success": True}

def test_delete_expense_in_closed_project(client, auth_headers, setup_category):
    # Create project 
    project_resp = client.post("/projects/", headers=auth_headers, json={"name": "Locked Project", "status": "in_progress"})
    project_id = project_resp.json()["id"]
    
    # Create expense
    exp_resp = client.post(
        "/ledger/",
        headers=auth_headers,
        json={"description": "Locked Expense", "amount": 25.00, "date": "2023-10-01", "project_id": project_id, "category_id": setup_category}
    )
    expense_id = exp_resp.json()["id"]
    
    # Close project
    client.patch(f"/projects/{project_id}/close", headers=auth_headers)
    
    # Attempt to delete expense, should fail because project is closed (Returns 404 in logic or fails)
    response = client.delete(f"/ledger/{expense_id}", headers=auth_headers)
    assert response.status_code == 404
