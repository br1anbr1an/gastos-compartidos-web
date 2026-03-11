import pytest
from schemas import ExpenseUpdate
import datetime

def test_expense_update_date_validation():
    # Test with simple date string
    update = ExpenseUpdate(date="2026-03-11")
    assert update.date == datetime.date(2026, 3, 11)
    
    # Test with ISO string (what the frontend was sending)
    update = ExpenseUpdate(date="2026-03-11T00:00:00.000Z")
    assert update.date == datetime.date(2026, 3, 11)
    
    # Test with None (it's optional)
    update = ExpenseUpdate(date=None)
    assert update.date is None

    # Test with other fields to ensure no regression
    update = ExpenseUpdate(description="New desc", amount=100.5)
    assert update.description == "New desc"
    assert update.amount == 100.5
