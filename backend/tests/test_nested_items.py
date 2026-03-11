import pytest
import schemas
import crud
from datetime import date

def test_create_expense_with_items(db_session, test_user, test_project, test_category):
    # 1. Create expense with items
    expense_in = schemas.ExpenseCreate(
        description="Market Trip",
        amount=150.0,  # Total
        category_id=test_category.id,
        date=date.today(),
        project_id=test_project.id,
        user_id=test_user.id,
        items=[
            schemas.ExpenseItemCreate(description="Milk", amount=50.0),
            schemas.ExpenseItemCreate(description="Bread", amount=100.0)
        ]
    )
    
    # 2. Call crud.create_expense (takes 2 args: db and expense)
    db_expense = crud.create_expense(db_session, expense_in)
    
    # 3. Verify expense and items were created
    assert db_expense.id is not None
    assert db_expense.description == "Market Trip"
    assert len(db_expense.items) == 2
    assert any(item.description == "Milk" and float(item.amount) == 50.0 for item in db_expense.items)
    assert any(item.description == "Bread" and float(item.amount) == 100.0 for item in db_expense.items)

def test_update_expense_with_items(db_session, test_user, test_project, test_category):
    # 1. First create an expense
    expense_in = schemas.ExpenseCreate(
        description="Market Trip",
        amount=150.0,
        category_id=test_category.id,
        date=date.today(),
        project_id=test_project.id,
        user_id=test_user.id,
        items=[
            schemas.ExpenseItemCreate(description="Old Item", amount=150.0)
        ]
    )
    db_expense = crud.create_expense(db_session, expense_in)
    original_id = db_expense.id
    
    # 2. Update it with new items
    update_data = schemas.ExpenseUpdate(
        items=[
            schemas.ExpenseItemCreate(description="New Item 1", amount=75.0),
            schemas.ExpenseItemCreate(description="New Item 2", amount=75.0)
        ]
    )
    
    updated_expense = crud.update_expense(db_session, original_id, update_data)
    
    # 3. Verify items were synchronized (deleted and recreated)
    assert updated_expense.id == original_id
    assert len(updated_expense.items) == 2
    assert all(item.description.startswith("New Item") for item in updated_expense.items)
    assert not any(item.description == "Old Item" for item in updated_expense.items)
