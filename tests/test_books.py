"""
Book catalog endpoint tests.
"""

import pytest
from httpx import AsyncClient


async def get_auth_headers(client: AsyncClient, username: str, password: str) -> dict:
    """Helper to authenticate and return bearer token headers."""
    res = await client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_books(client: AsyncClient):
    """Test listing all books."""
    headers = await get_auth_headers(client, "testmember", "memberpw")
    response = await client.get("/api/books/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 2  # Active Book, Out of Stock Book
    assert data["total"] == 2


@pytest.mark.asyncio
async def test_list_books_filter(client: AsyncClient):
    """Test listing books with search filter."""
    headers = await get_auth_headers(client, "testmember", "memberpw")
    response = await client.get("/api/books/?search=Active", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Active Book"


@pytest.mark.asyncio
async def test_create_book_admin(client: AsyncClient):
    """Test book creation as admin succeeds."""
    headers = await get_auth_headers(client, "testadmin", "adminpw")
    payload = {
        "title": "New Admin Book",
        "author": "Author X",
        "isbn": "999-888",
        "category": "Technology",
        "total_copies": 5
    }
    response = await client.post("/api/books/", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "New Admin Book"
    assert data["available_copies"] == 5


@pytest.mark.asyncio
async def test_create_book_member_forbidden(client: AsyncClient):
    """Test that members cannot create books (RBAC check)."""
    headers = await get_auth_headers(client, "testmember", "memberpw")
    payload = {
        "title": "New Book",
        "author": "Author Y",
        "isbn": "111-222"
    }
    response = await client.post("/api/books/", json=payload, headers=headers)
    assert response.status_code == 403
    assert "Access denied" in response.json()["error"]["message"]
