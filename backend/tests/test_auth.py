from datetime import timedelta
from auth import get_password_hash, verify_password, create_access_token

# ==== UNIT TESTS FOR AUTHENTICATION ====

def test_password_hashing():
    """Test that a password can be hashed and verified properly."""
    password = "supersecretpassword123"
    hashed_password = get_password_hash(password)
    
    assert password != hashed_password
    assert verify_password(password, hashed_password) is True
    assert verify_password("wrongpassword", hashed_password) is False

def test_jwt_token_creation():
    """Test that a JWT token can be created and contains the correct data."""
    data = {"sub": "test@example.com"}
    token = create_access_token(data=data, expires_delta=timedelta(minutes=10))
    
    assert token is not None
    assert type(token) == str
    assert len(token) > 20

def test_user_registration(client):
    """Test the complete user registration flow."""
    response = client.post(
        "/users/",
        json={"name": "Test User", "email": "test@test.com", "password": "mypassword123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@test.com"
    assert data["name"] == "Test User"
    assert "id" in data
    assert "password" not in data
    
def test_duplicate_user_registration(client):
    """Test that registering an existing email fails."""
    client.post(
        "/users/",
        json={"name": "Dup User", "email": "duplicate@test.com", "password": "123"}
    )
    
    response = client.post(
        "/users/",
        json={"name": "Dup User 2", "email": "duplicate@test.com", "password": "456"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

def test_user_login(client):
    """Test the login flow generating a JWT token."""
    client.post(
        "/users/",
        json={"name": "Login User", "email": "login@test.com", "password": "securepassword"}
    )
    
    response = client.post(
        "/token",
        data={"username": "login@test.com", "password": "securepassword"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_invalid_login(client):
    """Test that invalid credentials fail to log in."""
    response = client.post(
        "/token",
        data={"username": "nonexistent@test.com", "password": "wrongpassword"}
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

def test_protected_route_access(client):
    """Test accessing the /users/me protected route with and without token."""
    response_unauth = client.get("/users/me")
    assert response_unauth.status_code == 401
    
    client.post(
        "/users/",
        json={"name": "Protected User", "email": "protected@test.com", "password": "123"}
    )
    login_response = client.post(
        "/token",
        data={"username": "protected@test.com", "password": "123"}
    )
    token = login_response.json()["access_token"]
    
    response_auth = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response_auth.status_code == 200
    assert response_auth.json()["email"] == "protected@test.com"
