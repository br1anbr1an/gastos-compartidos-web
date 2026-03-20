from database import SessionLocal
import models
db = SessionLocal()
expense = models.Expense(description="Test precision", amount=2220.00, category_id=1, date="2026-03-19", project_id=1)
db.add(expense)
db.commit()
db.refresh(expense)
print(f"Saved amount: {expense.amount}")
db.delete(expense)
db.commit()
