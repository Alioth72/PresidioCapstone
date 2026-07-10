"""
AI Chat service — Gemini-powered conversational assistant with function calling.
"""

# TODO: Implement:
# - ChatAssistant class
#   - __init__(user_id, db_session)
#   - process_message(message: str) -> ChatResponse
#   - _build_system_prompt() -> str
#   - _get_tools() -> list  (function declarations for Gemini)
#   - _execute_tool_call(tool_name, args) -> dict
#   - _confirm_action(action_description) -> str
#
# Tool functions to expose to Gemini:
#   - search_books(query, author, category)
#   - check_availability(book_id)
#   - borrow_book(book_id)
#   - return_book(loan_id)
#   - list_my_loans()
#   - list_my_overdue()
#
# Session management:
#   - In-memory chat history per user session
#   - Context window management
