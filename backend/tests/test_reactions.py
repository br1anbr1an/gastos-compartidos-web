import pytest
import schemas
import crud
from conftest import TestingSessionLocal

@pytest.fixture(scope="module")
def setup_category():
    db = TestingSessionLocal()
    cat_in = schemas.CategoryCreate(name="Reaction Category")
    cat = crud.create_category(db, cat_in)
    db.close()
    return cat.id

@pytest.fixture(scope="module")
def user_token(client):
    client.post(
        "/users/",
        json={"name": "Reaction User", "email": "reaction@test.com", "password": "secure123"}
    )
    response = client.post(
        "/token",
        data={"username": "reaction@test.com", "password": "secure123"}
    )
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}

def test_create_reaction(client, auth_headers, setup_category):
    # 1. Create a project and expense first
    project_res = client.post("/projects/", json={"name": "Test Project"}, headers=auth_headers)
    project_id = project_res.json()["id"]
    
    expense_res = client.post("/ledger/", json={
        "description": "Test Reaction Expense",
        "amount": 100.0,
        "category_id": setup_category,
        "date": "2024-03-07",
        "project_id": project_id
    }, headers=auth_headers)
    expense_id = expense_res.json()["id"]
    
    # 2. Add a reaction
    reaction_res = client.post(f"/ledger/{expense_id}/reactions", json={"emoji": "❤️"}, headers=auth_headers)
    assert reaction_res.status_code == 200
    data = reaction_res.json()
    assert data["emoji"] == "❤️"
    assert data["expense_id"] == expense_id
    
    # 3. Verify in GET expenses
    get_res = client.get(f"/ledger/?project_id={project_id}", headers=auth_headers)
    expense_data = next(e for e in get_res.json() if e["id"] == expense_id)
    assert len(expense_data["reactions"]) == 1
    assert expense_data["reactions"][0]["emoji"] == "❤️"

def test_toggle_reaction(client, auth_headers, setup_category):
    # Setup
    project_res = client.post("/projects/", json={"name": "Toggle Project"}, headers=auth_headers)
    project_id = project_res.json()["id"]
    expense_res = client.post("/ledger/", json={
        "description": "Toggle Expense",
        "amount": 50.0,
        "category_id": setup_category,
        "date": "2024-03-07",
        "project_id": project_id
    }, headers=auth_headers)
    expense_id = expense_res.json()["id"]
    
    # Add reaction
    client.post(f"/ledger/{expense_id}/reactions", json={"emoji": "😂"}, headers=auth_headers)
    
    # Add SAME reaction (should toggle off)
    res = client.post(f"/ledger/{expense_id}/reactions", json={"emoji": "😂"}, headers=auth_headers)
    assert res.status_code == 200
    # Current implementation returns None on toggle off
    assert res.json() is None
    
    # Verify empty
    get_res = client.get(f"/ledger/?project_id={project_id}", headers=auth_headers)
    expense_data = next(e for e in get_res.json() if e["id"] == expense_id)
    assert len(expense_data["reactions"]) == 0
