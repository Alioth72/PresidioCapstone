"""
Auth endpoint tests.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup(client: AsyncClient):
    """Test user registration."""
    payload = {
        "username": "newuser",
        "email": "newuser@test.com",
        "password": "securepassword123",
        "full_name": "New User"
    }
    response = await client.post("/api/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@test.com"
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_signup_duplicate_username(client: AsyncClient):
    """Test registration fails with duplicate username."""
    # testmember is pre-seeded in conftest clean_database
    payload = {
        "username": "testmember",
        "email": "another@test.com",
        "password": "password123"
    }
    response = await client.post("/api/auth/signup", json=payload)
    assert response.status_code == 400
    assert "Username already taken" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    """Test user login, JWT generation, and cookie generation."""
    payload = {
        "username": "testmember",
        "password": "memberpw"
    }
    response = await client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "testmember"
    
    # Check that HTTPOnly cookie is set
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    """Test login fails with invalid credentials."""
    payload = {
        "username": "testmember",
        "password": "wrongpassword"
    }
    response = await client.post("/api/auth/login", json=payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_no_token(client: AsyncClient):
    """Test /me endpoint fails without authentication."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_with_token(client: AsyncClient):
    """Test /me endpoint succeeds with valid cookie token."""
    # Login to get session
    login_payload = {
        "username": "testmember",
        "password": "memberpw"
    }
    login_res = await client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    
    # Call /me with authorization header
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["username"] == "testmember"
