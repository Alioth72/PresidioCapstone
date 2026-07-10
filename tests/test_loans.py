"""
Loan endpoint tests.
"""

import pytest


@pytest.mark.asyncio
async def test_borrow_book(client):
    """Test borrowing an available book."""
    # TODO: Implement
    pass


@pytest.mark.asyncio
async def test_return_book(client):
    """Test returning a borrowed book."""
    # TODO: Implement
    pass


@pytest.mark.asyncio
async def test_borrow_unavailable(client):
    """Test borrowing when no copies available."""
    # TODO: Implement
    pass
