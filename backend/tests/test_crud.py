from sqlalchemy.orm import Session
import pytest
import crud
import schemas
import models
import datetime

def test_create_category(db_session):
    category_in = schemas.CategoryCreate(name="Groceries")
    category = crud.create_category(db_session, category_in)
    assert category.id is not None
    assert category.name == "Groceries"
    assert category.active is True
    assert category.created_at is not None

def test_get_categories(db_session, test_category):
    categories = crud.get_categories(db_session)
    assert len(categories) > 0
    assert any(c.name == test_category.name for c in categories)

def test_create_user(db_session):
    user_in = schemas.UserCreate(
        name="CRUD User", 
        email="crud.user@example.com", 
        password="secure123"
    )
    user = crud.create_user(db_session, user_in)
    assert user.id is not None
    assert user.name == "CRUD User"
    assert user.email == "crud.user@example.com"
    # Password should be hashed, not raw
    assert user.password_hash != "secure123"

def test_authenticate_user_success(db_session, test_user):
    user = crud.authenticate_user(db_session, test_user.email, "fixturepassword")
    assert user is not False
    assert user.id == test_user.id

def test_authenticate_user_fail_wrong_password(db_session, test_user):
    user = crud.authenticate_user(db_session, test_user.email, "wrongpassword")
    assert user is False

def test_create_and_get_project(db_session):
    project_in = schemas.ProjectCreate(name="Vacation Fund", status="in_progress")
    project = crud.create_project(db_session, project_in)
    assert project.id is not None
    
    fetched = crud.get_project(db_session, project.id)
    assert fetched is not None
    assert fetched.name == "Vacation Fund"
    assert fetched.status == "in_progress"

def test_project_last_activity_at(db_session: Session, test_user, test_project, test_category):
    # Use a timezone-naive comparison for local sqlite compatibility, 
    # but ensure we don't mix aware/naive if the driver returns aware.
    past_date = datetime.datetime(2020, 1, 1)
    
    def get_activity():
        res = db_session.query(models.Project.last_activity_at).filter(models.Project.id == test_project.id).first()
        val = res[0]
        # If the DB returns an aware datetime, make past_date aware too
        nonlocal past_date
        if val and val.tzinfo is not None and past_date.tzinfo is None:
            past_date = past_date.replace(tzinfo=datetime.timezone.utc)
        return val

    def reset_activity():
        db_session.query(models.Project).filter(models.Project.id == test_project.id).update(
            {"last_activity_at": datetime.datetime(2010, 1, 1)}
        )
        db_session.commit()

    # 1. Test Create
    reset_activity()
    expense_data = schemas.ExpenseCreate(
        description="Test for activity",
        amount=100.0,
        category_id=test_category.id,
        date=datetime.date.today(),
        is_loan=False,
        project_id=test_project.id
    )
    db_expense = crud.create_expense(db_session, expense_data)
    
    after_create = get_activity()
    assert after_create > past_date

    # 2. Test Modify
    reset_activity()
    expense_update = schemas.ExpenseUpdate(amount=200.0)
    crud.update_expense(db_session, db_expense.id, expense_update)
    
    after_update = get_activity()
    assert after_update > past_date

    # 3. Test Upsert reaction
    reset_activity()
    crud.upsert_reaction(db_session, db_expense.id, test_user.id, "👍")
    
    after_reaction = get_activity()
    assert after_reaction > past_date

    # 4. Test Delete
    reset_activity()
    crud.delete_expense(db_session, db_expense.id)
    
    after_delete = get_activity()
    assert after_delete > past_date


def test_create_expense_with_items(db_session: Session, test_user, test_project, test_category):
    from datetime import date
    expense_in = schemas.ExpenseCreate(
        description="Dinner",
        amount=50.25,
        category_id=test_category.id,
        date=date.today(),
        project_id=test_project.id,
        is_loan=False,
        items=[
            schemas.ExpenseItemCreate(description="Food", amount=30.0),
            schemas.ExpenseItemCreate(description="Drinks", amount=20.25)
        ]
    )
    db_expense = crud.create_expense(db_session, expense_in)
    assert db_expense.id is not None
    assert len(db_expense.items) == 2
    assert db_expense.items[0].description == "Food"

def test_close_project(db_session, test_project):
    closed = crud.close_project(db_session, test_project.id)
    assert closed.status == "paid"
    assert closed.closed_at is not None

def test_create_expense(db_session, test_user, test_project, test_category):
    from datetime import date
    expense_in = schemas.ExpenseCreate(
        description="Dinner",
        amount=50.25,
        category_id=test_category.id,
        date=date.today(),
        project_id=test_project.id
    )
    
    # Normally user_id is injected by the endpoint, but let's test crud directly
    # To do that, we need to modify the expense object before saving or handle it in crud
    # In schemas.ExpenseCreate, user_id is not included. It's added in main.py.
    # Let's import the SQL model directly to test inserting an expense with a user
    import models
    expense_data = expense_in.model_dump(exclude_none=True)
    expense_data["user_id"] = test_user.id
    db_expense = models.Expense(**expense_data)
    db_session.add(db_expense)
    db_session.commit()
    db_session.refresh(db_expense)
    
    expenses = crud.get_expenses(db_session, project_id=test_project.id)
    assert len(expenses) == 1
    assert expenses[0].description == "Dinner"
    assert expenses[0].user_id == test_user.id

def test_delete_expense_open_project(db_session, test_project, test_category):
    import models
    from datetime import date
    db_expense = models.Expense(
        description="To Delete",
        amount=10.0,
        category_id=test_category.id,
        date=date.today(),
        project_id=test_project.id
    )
    db_session.add(db_expense)
    db_session.commit()
    db_session.refresh(db_expense)
    
    success = crud.delete_expense(db_session, db_expense.id)
    assert success is True
    
    # Verify it's gone
    expenses = crud.get_expenses(db_session, test_project.id)
    assert len(expenses) == 0

def test_delete_expense_closed_project_fails(db_session, test_project, test_category):
    import models
    from datetime import date
    db_expense = models.Expense(
        description="Locked Expense",
        amount=10.0,
        category_id=test_category.id,
        date=date.today(),
        project_id=test_project.id
    )
    db_session.add(db_expense)
    db_session.commit()
    db_session.refresh(db_expense)
    
    # Close project
    crud.close_project(db_session, test_project.id)
    
    # Attempt delete
    success = crud.delete_expense(db_session, db_expense.id)
    assert success is False
    
    # Verify it's still there
    expenses = crud.get_expenses(db_session, test_project.id)
    assert len(expenses) == 1
