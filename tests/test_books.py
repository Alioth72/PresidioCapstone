"""
Book catalog endpoint tests.
"""

import pytest


@pytest.mark.asyncio
async def test_list_books(client):
    """Test listing all books."""
    # TODO: Implement
    pass


@pytest.mark.asyncio
async def test_create_book_admin(client):
    """Test book creation as admin."""
    # TODO: Implement
    pass


@pytest.mark.asyncio
async def test_create_book_member_forbidden(client):
    """Test that members cannot create books."""
    # TODO: Implement
    pass
