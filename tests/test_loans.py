"""
Loan endpoint tests.
"""

import pytest
from httpx import AsyncClient

from tests.test_books import get_auth_headers


@pytest.mark.asyncio
async def test_borrow_book(client: AsyncClient):
    """Test borrowing an available book."""
    member_headers = await get_auth_headers(client, "testmember", "memberpw")
    
    # Get active book ID
    catalog_res = await client.get("/api/books/?search=Active", headers=member_headers)
    assert catalog_res.status_code == 200
    book_id = catalog_res.json()["items"][0]["id"]
    
    # Borrow
    borrow_res = await client.post("/api/loans/borrow", json={"book_id": book_id}, headers=member_headers)
    assert borrow_res.status_code == 201
    loan_data = borrow_res.json()
    assert loan_data["book_id"] == book_id
    assert loan_data["is_active"] is True
    
    # Verify availability decremented
    catalog_res = await client.get(f"/api/books/{book_id}", headers=member_headers)
    assert catalog_res.json()["available_copies"] == 1


@pytest.mark.asyncio
async def test_borrow_unavailable(client: AsyncClient):
    """Test borrowing when no copies are available."""
    member_headers = await get_auth_headers(client, "testmember", "memberpw")
    
    # Get out of stock book ID
    catalog_res = await client.get("/api/books/?search=Stock", headers=member_headers)
    assert catalog_res.status_code == 200
    book_id = catalog_res.json()["items"][0]["id"]
    
    # Borrow should fail (HTTP 400 Bad Request)
    borrow_res = await client.post("/api/loans/borrow", json={"book_id": book_id}, headers=member_headers)
    assert borrow_res.status_code == 400
    assert "out of stock" in borrow_res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_return_book(client: AsyncClient):
    """Test returning a borrowed book."""
    member_headers = await get_auth_headers(client, "testmember", "memberpw")
    
    # Get active book
    catalog_res = await client.get("/api/books/?search=Active", headers=member_headers)
    book_id = catalog_res.json()["items"][0]["id"]
    
    # Borrow
    borrow_res = await client.post("/api/loans/borrow", json={"book_id": book_id}, headers=member_headers)
    assert borrow_res.status_code == 201
    loan_id = borrow_res.json()["id"]
    
    # Return
    return_res = await client.post(f"/api/loans/{loan_id}/return", headers=member_headers)
    assert return_res.status_code == 200
    assert return_res.json()["is_active"] is False
    assert return_res.json()["returned_at"] is not None
    
    # Verify availability restored
    catalog_res = await client.get(f"/api/books/{book_id}", headers=member_headers)
    assert catalog_res.json()["available_copies"] == 2


@pytest.mark.asyncio
async def test_borrow_limit_exceeded(client: AsyncClient):
    """Test member cannot exceed maximum active loans limit."""
    member_headers = await get_auth_headers(client, "testmember", "memberpw")
    admin_headers = await get_auth_headers(client, "testadmin", "adminpw")
    
    # We will create 5 more books with total_copies=1 to borrow
    borrowed_ids = []
    for i in range(5):
        new_book_res = await client.post(
            "/api/books/",
            json={"title": f"Limit Book {i}", "author": "Author", "isbn": f"isbn-{i}", "total_copies": 1},
            headers=admin_headers
        )
        assert new_book_res.status_code == 201
        borrowed_ids.append(new_book_res.json()["id"])
        
    # Borrow 5 books (succeeds)
    for b_id in borrowed_ids:
        res = await client.post("/api/loans/borrow", json={"book_id": b_id}, headers=member_headers)
        assert res.status_code == 201
        
    # Get another book to borrow (the 6th book)
    catalog_res = await client.get("/api/books/?search=Active", headers=member_headers)
    book_id = catalog_res.json()["items"][0]["id"]
    
    # Borrow 6th should fail (limit is 5)
    limit_res = await client.post("/api/loans/borrow", json={"book_id": book_id}, headers=member_headers)
    assert limit_res.status_code == 400
    assert "limit reached" in limit_res.json()["error"]["message"]
