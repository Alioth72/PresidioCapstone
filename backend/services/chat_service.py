"""
AI Chat service — Gemini-powered conversational assistant with function calling.
Uses OpenAI compatibility layer.
"""

import json
import logging
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.config import settings
from backend.db.models import ChatMessage, ChatRole, Book, Loan
from backend.services import book_service, loan_service

logger = logging.getLogger(__name__)

# JSON Schema declarations for tools exposed to the agent
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_catalog",
            "description": "Search the library catalog for books matching a query (e.g. title, author, category, description) or specific category.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {
                        "type": "string",
                        "description": "General search query for titles, authors, description, etc."
                    },
                    "category": {
                        "type": "string",
                        "description": "Specific book category to filter by (e.g. Fiction, History, Science)."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_book_details",
            "description": "Get detailed information about a specific book by its integer ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "book_id": {
                        "type": "integer",
                        "description": "The unique integer ID of the book."
                    }
                },
                "required": ["book_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "borrow_book",
            "description": "Borrow a book for the current user. Requires the integer ID of the book.",
            "parameters": {
                "type": "object",
                "properties": {
                    "book_id": {
                        "type": "integer",
                        "description": "The unique integer ID of the book to borrow."
                    }
                },
                "required": ["book_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "return_book",
            "description": "Return a book for the current user. Requires the integer ID of the loan transaction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "loan_id": {
                        "type": "integer",
                        "description": "The unique integer ID of the loan record to return."
                    }
                },
                "required": ["loan_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_my_loans",
            "description": "List all active (currently checked out) books for the logged-in user.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]

SYSTEM_PROMPT = """You are the AI Library Assistant for our high-performance, Neo-Brutalist Library Management System.
You are helping the logged-in Member (User ID: {user_id}).

Your capabilities:
1. Search the book catalog by terms, authors, descriptions, or categories.
2. View detailed book information.
3. Check what books the user has borrowed currently.
4. Borrow a book for the user if it is available.
5. Return a book for the user.

Behavioral Guidelines:
- Be helpful, conversational, and direct.
- When searching, always tell the user the titles, authors, and the unique book IDs so they can easily ask to borrow them.
- When borrowing a book, you MUST check if it's available. If the user mentions a title, first search the catalog to find the correct book ID, then invoke `borrow_book`.
- If the user has exceeded their maximum active loans (5), borrowing will fail and you should explain this limit.
- If a book is out of stock (available_copies = 0), explain that it is currently unavailable.
- For returns, look up their active loans first using `list_my_loans` to get the correct `loan_id` before invoking `return_book`.
- DO NOT invent book IDs or loan IDs. Always fetch them using the tools first.
- Keep responses concise and formatted in clean markdown.
"""


class SimpleFunction:
    def __init__(self, name: str, arguments: str):
        self.name = name
        self.arguments = arguments

class SimpleToolCall:
    def __init__(self, id: str, name: str, arguments: str):
        self.id = id
        self.type = "function"
        self.function = SimpleFunction(name, arguments)

class SimpleChoiceMessage:
    def __init__(self, role: str, content: Optional[str], tool_calls: Optional[List[SimpleToolCall]] = None):
        self.role = role
        self.content = content
        self.tool_calls = tool_calls

class SimpleChoice:
    def __init__(self, message: SimpleChoiceMessage):
        self.message = message

class SimpleResponse:
    def __init__(self, choices: List[SimpleChoice]):
        self.choices = choices


class ChatService:
    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id
        
        # Initialize OpenAI client pointing to Google's compatibility base URL
        api_key = settings.GEMINI_API_KEY or "dummy-key"
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )

    async def _call_gemini_completions(self, messages: list) -> SimpleResponse:
        """Sends chat completions request to Gemini using direct HTTP to support new AQ. keys."""
        url = f"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key={settings.GEMINI_API_KEY}"
        payload = {
            "model": settings.GEMINI_MODEL,
            "messages": messages,
            "tools": TOOLS,
            "tool_choice": "auto"
        }
        headers = {
            "Authorization": f"Bearer {settings.GEMINI_API_KEY}"
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code != 200:
                raise Exception(f"Error code: {res.status_code} - {res.text}")
            
            data = res.json()
            choices = []
            for choice_data in data.get("choices", []):
                msg_data = choice_data.get("message", {})
                role = msg_data.get("role", "assistant")
                content = msg_data.get("content")
                
                tool_calls_data = msg_data.get("tool_calls")
                tool_calls = None
                if tool_calls_data:
                    tool_calls = []
                    for tc in tool_calls_data:
                        tc_id = tc.get("id")
                        func_data = tc.get("function", {})
                        func_name = func_data.get("name")
                        func_args = func_data.get("arguments")
                        tool_calls.append(SimpleToolCall(tc_id, func_name, func_args))
                
                choices.append(SimpleChoice(SimpleChoiceMessage(role, content, tool_calls)))
            
            return SimpleResponse(choices)

    async def execute_tool_call(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Executes the tool call and returns the result as a JSON string."""
        logger.info(f"Executing tool {tool_name} with args {arguments}")
        try:
            if tool_name == "search_catalog":
                search = arguments.get("search")
                category = arguments.get("category")
                result = await book_service.list_books(
                    self.db,
                    search=search,
                    category=category,
                    page=1,
                    limit=10,
                    sort_by="title",
                    order="asc"
                )
                
                books_data = []
                for b in result["items"]:
                    books_data.append({
                        "id": b.id,
                        "title": b.title,
                        "author": b.author,
                        "isbn": b.isbn,
                        "category": b.category,
                        "available_copies": b.available_copies,
                        "total_copies": b.total_copies,
                        "average_rating": b.average_rating
                    })
                return json.dumps(books_data)

            elif tool_name == "get_book_details":
                book_id = int(arguments.get("book_id"))
                book = await book_service.get_book(self.db, book_id)
                if not book:
                    return json.dumps({"error": "Book not found."})
                return json.dumps({
                    "id": book.id,
                    "title": book.title,
                    "author": book.author,
                    "isbn": book.isbn,
                    "description": book.description,
                    "category": book.category,
                    "publisher": book.publisher,
                    "publication_year": book.publication_year,
                    "available_copies": book.available_copies,
                    "total_copies": book.total_copies,
                    "average_rating": book.average_rating,
                    "review_count": book.review_count
                })

            elif tool_name == "borrow_book":
                book_id = int(arguments.get("book_id"))
                loan = await loan_service.borrow_book(self.db, self.user_id, book_id)
                return json.dumps({
                    "success": True,
                    "loan_id": loan.id,
                    "book_title": loan.book_title,
                    "due_date": loan.due_date.isoformat()
                })

            elif tool_name == "return_book":
                loan_id = int(arguments.get("loan_id"))
                loan = await loan_service.return_book(self.db, self.user_id, loan_id)
                return json.dumps({
                    "success": True,
                    "loan_id": loan.id,
                    "book_title": loan.book_title,
                    "returned_at": loan.returned_at.isoformat()
                })

            elif tool_name == "list_my_loans":
                loans_result = await self.db.execute(
                    select(Loan)
                    .where(Loan.user_id == self.user_id, Loan.is_active == True)
                )
                loans = loans_result.scalars().all()
                loans_data = []
                for l in loans:
                    loans_data.append({
                        "loan_id": l.id,
                        "book_id": l.book_id,
                        "book_title": l.book_title,
                        "book_author": l.book_author,
                        "borrowed_at": l.borrowed_at.isoformat(),
                        "due_date": l.due_date.isoformat()
                    })
                return json.dumps(loans_data)

            else:
                return json.dumps({"error": f"Tool '{tool_name}' not implemented."})

        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return json.dumps({"error": str(e)})

    async def process_message(self, user_message: str) -> Dict[str, Any]:
        """
        Sends user message (plus history context) to Gemini,
        executes any tool calls, saves conversation, and returns reply.
        """
        if not settings.TESTING and (not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key"):
            return {
                "reply": "I'm sorry, but my Gemini AI key has not been configured in the `.env` file yet. Please set a valid `GEMINI_API_KEY` to chat with me!",
                "actions_taken": []
            }

        # 1. Fetch last 20 messages for context
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.user_id == self.user_id)
            .order_by(ChatMessage.created_at.asc())
        )
        messages_orm = result.scalars().all()

        messages = [{"role": "system", "content": SYSTEM_PROMPT.format(user_id=self.user_id)}]
        for msg in messages_orm[-20:]:
            messages.append({
                "role": msg.role.value,
                "content": msg.content
            })

        # Add the new message
        messages.append({
            "role": "user",
            "content": user_message
        })

        actions_taken = []
        try:
            # 2. Call Gemini API endpoint
            response = await self._call_gemini_completions(messages)

            # 3. Agent loop (handles tool calls sequentially)
            for _ in range(5):
                response_message = response.choices[0].message
                tool_calls = response_message.tool_calls

                if not tool_calls:
                    break

                # Append assistant tool-call prompt to context history
                assistant_dict = {
                    "role": "assistant",
                    "content": response_message.content
                }
                if tool_calls:
                    assistant_dict["tool_calls"] = [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments
                            }
                        } for tc in tool_calls
                    ]
                messages.append(assistant_dict)

                # Process each tool call requested by LLM
                for tool_call in tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)

                    # Execute python function
                    tool_output = await self.execute_tool_call(tool_name, tool_args)
                    actions_taken.append(f"Called {tool_name} with {tool_args}")

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_name,
                        "content": tool_output
                    })

                # Re-submit history + tool results back to LLM
                response = await self._call_gemini_completions(messages)

            final_reply = response.choices[0].message.content or ""

            # 4. Store conversation in database
            user_msg_orm = ChatMessage(
                user_id=self.user_id,
                role=ChatRole.USER,
                content=user_message,
                actions_taken=[]
            )
            self.db.add(user_msg_orm)

            assistant_msg_orm = ChatMessage(
                user_id=self.user_id,
                role=ChatRole.ASSISTANT,
                content=final_reply,
                actions_taken=actions_taken
            )
            self.db.add(assistant_msg_orm)

            await self.db.commit()

            return {
                "reply": final_reply,
                "actions_taken": actions_taken
            }

        except Exception as e:
            logger.error(f"Error in chat process_message: {e}")
            return {
                "reply": f"Sorry, I encountered an error communicating with Gemini: {str(e)}",
                "actions_taken": actions_taken
            }
