"""
AI chat assistant tests with mocked Gemini/OpenAI API calls.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch
from tests.test_books import get_auth_headers

# Mock response classes
class MockFunction:
    def __init__(self, name, arguments):
        self.name = name
        self.arguments = arguments

class MockToolCall:
    def __init__(self, id, name, arguments):
        self.id = id
        self.type = "function"
        self.function = MockFunction(name, arguments)

class MockChoiceMessage:
    def __init__(self, content, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls

class MockChoice:
    def __init__(self, content, tool_calls=None):
        self.message = MockChoiceMessage(content, tool_calls)

class MockResponse:
    def __init__(self, content, tool_calls=None):
        self.choices = [MockChoice(content, tool_calls)]


@pytest.mark.asyncio
async def test_chat_access_control(client: AsyncClient):
    """Verify that only members can access the chat assistant endpoints."""
    # 1. Anonymous user -> Unauthorized (401)
    res = await client.post("/api/chat/", json={"message": "hello"})
    assert res.status_code == 401

    # Get credentials headers
    admin_headers = await get_auth_headers(client, "testadmin", "adminpw")
    member_headers = await get_auth_headers(client, "testmember", "memberpw")

    # 2. Admin user -> Forbidden (403)
    res = await client.post("/api/chat/", json={"message": "hello"}, headers=admin_headers)
    assert res.status_code == 403

    # 3. History endpoint permissions
    res = await client.get("/api/chat/history", headers=admin_headers)
    assert res.status_code == 403

    res = await client.get("/api/chat/history", headers=member_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
@patch("backend.config.settings.GEMINI_API_KEY", "mock-valid-key")
@patch("backend.services.chat_service.ChatService._call_gemini_completions", new_callable=AsyncMock)
async def test_chat_clear_history(mock_create, client: AsyncClient):
    """Verify that clear_history deletes logs for the logged-in member."""
    # Mock LLM response
    mock_create.return_value = MockResponse(content="I am a chatbot.")
    member_headers = await get_auth_headers(client, "testmember", "memberpw")

    # Send a message to populate history
    res = await client.post("/api/chat/", json={"message": "temporary message"}, headers=member_headers)
    assert res.status_code == 200

    # Retrieve history
    res = await client.get("/api/chat/history", headers=member_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # Delete history
    res = await client.delete("/api/chat/history", headers=member_headers)
    assert res.status_code == 204

    # Verify history is empty
    res = await client.get("/api/chat/history", headers=member_headers)
    assert len(res.json()) == 0


@pytest.mark.asyncio
@patch("backend.config.settings.GEMINI_API_KEY", "mock-valid-key")
@patch("backend.services.chat_service.ChatService._call_gemini_completions", new_callable=AsyncMock)
async def test_chat_assistant_message_flow(mock_create, client: AsyncClient):
    """Test standard chat assistant message processing with mocked LLM response."""
    mock_create.return_value = MockResponse(content="Hello! I am your library assistant. How can I help you?")
    member_headers = await get_auth_headers(client, "testmember", "memberpw")

    res = await client.post("/api/chat/", json={"message": "hi there"}, headers=member_headers)
    assert res.status_code == 200
    data = res.json()
    assert "library assistant" in data["reply"]
    assert data["actions_taken"] == []


@pytest.mark.asyncio
@patch("backend.config.settings.GEMINI_API_KEY", "mock-valid-key")
@patch("backend.services.chat_service.ChatService._call_gemini_completions", new_callable=AsyncMock)
async def test_chat_assistant_tool_call_flow(mock_create, client: AsyncClient):
    """Test agent loop where model makes a tool call to search the catalog."""
    mock_create.side_effect = [
        MockResponse(
            content=None,
            tool_calls=[MockToolCall(id="call_1", name="search_catalog", arguments='{"search": "Active Book"}')]
        ),
        MockResponse(
            content="I found 'Active Book' in the catalog."
        )
    ]
    member_headers = await get_auth_headers(client, "testmember", "memberpw")

    res = await client.post("/api/chat/", json={"message": "find Active Book"}, headers=member_headers)
    assert res.status_code == 200
    data = res.json()
    assert "Active Book" in data["reply"]
    assert len(data["actions_taken"]) >= 1
    assert "Called search_catalog" in data["actions_taken"][0]
