"""
Auth endpoint tests.
"""

import pytest


@pytest.mark.asyncio
async def test_signup(client):
    """Test user registration."""
    # TODO: Implement signup test
    pass


@pytest.mark.asyncio
async def test_login(client):
    """Test user login and JWT generation."""
    # TODO: Implement login test
    pass


@pytest.mark.asyncio
async def test_get_current_user(client):
    """Test /me endpoint with valid token."""
    # TODO: Implement current user test
    pass
