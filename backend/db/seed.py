"""
Database seed script — populates 2 users, 100 books, and sample loans.
Idempotent: checks if data exists before inserting.

Run: python -m backend.db.seed
"""

import asyncio
import random
from datetime import datetime, timezone, timedelta

import bcrypt as _bcrypt
from sqlalchemy import select, func

from backend.db.session import async_session, init_db
from backend.db.models import User, Book, Loan, UserRole

# ─── Seed Data ───

SEED_USERS = [
    {"username": "admin", "email": "admin@library.com", "full_name": "Library Admin",
     "password": "admin123", "role": UserRole.ADMIN},
    {"username": "member", "email": "member@library.com", "full_name": "Test Member",
     "password": "member123", "role": UserRole.MEMBER},
]

SEED_BOOKS = [
    # Fiction / Classics (15)
    ("1984", "George Orwell", "978-0451524935", "Dystopian novel about totalitarian government.", "Fiction", "Signet Classics", 1949),
    ("To Kill a Mockingbird", "Harper Lee", "978-0061120084", "Story of racial injustice in the American South.", "Fiction", "Harper Perennial", 1960),
    ("The Great Gatsby", "F. Scott Fitzgerald", "978-0743273565", "Jazz Age tale of wealth and the American Dream.", "Fiction", "Scribner", 1925),
    ("Pride and Prejudice", "Jane Austen", "978-0141439518", "Classic romance of manners in Regency England.", "Fiction", "Penguin Classics", 1813),
    ("Brave New World", "Aldous Huxley", "978-0060850524", "Dystopian vision of a technologically controlled society.", "Fiction", "Harper Perennial", 1932),
    ("The Catcher in the Rye", "J.D. Salinger", "978-0316769488", "Coming-of-age story of teenage alienation.", "Fiction", "Little, Brown", 1951),
    ("One Hundred Years of Solitude", "Gabriel Garcia Marquez", "978-0060883287", "Multi-generational saga of the Buendia family.", "Fiction", "Harper Perennial", 1967),
    ("Jane Eyre", "Charlotte Bronte", "978-0141441146", "Gothic romance and bildungsroman.", "Fiction", "Penguin Classics", 1847),
    ("Wuthering Heights", "Emily Bronte", "978-0141439556", "Tale of passionate and destructive love.", "Fiction", "Penguin Classics", 1847),
    ("Great Expectations", "Charles Dickens", "978-0141439563", "Story of an orphan's rise in Victorian England.", "Fiction", "Penguin Classics", 1861),
    ("The Picture of Dorian Gray", "Oscar Wilde", "978-0141439570", "Gothic novel about beauty and moral corruption.", "Fiction", "Penguin Classics", 1890),
    ("Crime and Punishment", "Fyodor Dostoevsky", "978-0143058144", "Psychological drama of guilt and redemption.", "Fiction", "Penguin Classics", 1866),
    ("Anna Karenina", "Leo Tolstoy", "978-0143035008", "Epic novel of love and society in Imperial Russia.", "Fiction", "Penguin Classics", 1877),
    ("The Brothers Karamazov", "Fyodor Dostoevsky", "978-0374528379", "Philosophical novel about faith and free will.", "Fiction", "FSG Classics", 1880),
    ("Moby-Dick", "Herman Melville", "978-0142437247", "Epic tale of obsession and the white whale.", "Fiction", "Penguin Classics", 1851),
    # Literary Fiction (10)
    ("The Kite Runner", "Khaled Hosseini", "978-1594631931", "Story of friendship and redemption in Afghanistan.", "Literary Fiction", "Riverhead Books", 2003),
    ("Life of Pi", "Yann Martel", "978-0156027328", "Survival story of a boy and a tiger at sea.", "Literary Fiction", "Mariner Books", 2001),
    ("The Book Thief", "Markus Zusak", "978-0375842207", "Death narrates a girl's life in Nazi Germany.", "Literary Fiction", "Knopf", 2005),
    ("A Man Called Ove", "Fredrik Backman", "978-1476738024", "Grumpy widower finds unexpected community.", "Literary Fiction", "Atria Books", 2012),
    ("The Alchemist", "Paulo Coelho", "978-0062315007", "Allegorical journey of self-discovery.", "Literary Fiction", "HarperOne", 1988),
    ("Beloved", "Toni Morrison", "978-1400033416", "Haunting tale of slavery's legacy.", "Literary Fiction", "Vintage", 1987),
    ("The Road", "Cormac McCarthy", "978-0307387899", "Post-apocalyptic journey of a father and son.", "Literary Fiction", "Vintage", 2006),
    ("Never Let Me Go", "Kazuo Ishiguro", "978-1400078776", "Dystopian story of friendship and mortality.", "Literary Fiction", "Vintage", 2005),
    ("Normal People", "Sally Rooney", "978-1984822185", "Interconnected lives of two Irish students.", "Literary Fiction", "Hogarth", 2018),
    ("Where the Crawdads Sing", "Delia Owens", "978-0735219106", "Mystery and coming-of-age in North Carolina marshlands.", "Literary Fiction", "Putnam", 2018),
    # Science Fiction & Fantasy (12)
    ("Dune", "Frank Herbert", "978-0441172719", "Epic saga of politics and ecology on a desert planet.", "Science Fiction", "Ace Books", 1965),
    ("Foundation", "Isaac Asimov", "978-0553293357", "Fall and rise of a galactic civilization.", "Science Fiction", "Bantam", 1951),
    ("Neuromancer", "William Gibson", "978-0441569595", "Cyberpunk classic about a washed-up hacker.", "Science Fiction", "Ace Books", 1984),
    ("The Hitchhiker's Guide to the Galaxy", "Douglas Adams", "978-0345391803", "Comic science fiction about the end of Earth.", "Science Fiction", "Del Rey", 1979),
    ("Ender's Game", "Orson Scott Card", "978-0812550702", "Child prodigy trained to fight alien invaders.", "Science Fiction", "Tor Books", 1985),
    ("Harry Potter and the Sorcerer's Stone", "J.K. Rowling", "978-0590353427", "A young wizard discovers his magical heritage.", "Fantasy", "Scholastic", 1997),
    ("The Lord of the Rings", "J.R.R. Tolkien", "978-0544003415", "Epic fantasy quest to destroy the One Ring.", "Fantasy", "Mariner Books", 1954),
    ("The Hobbit", "J.R.R. Tolkien", "978-0547928227", "Bilbo Baggins's unexpected adventure.", "Fantasy", "Mariner Books", 1937),
    ("Fahrenheit 451", "Ray Bradbury", "978-1451673319", "Dystopia where books are burned.", "Science Fiction", "Simon & Schuster", 1953),
    ("Slaughterhouse-Five", "Kurt Vonnegut", "978-0385333481", "Anti-war novel unstuck in time.", "Science Fiction", "Dial Press", 1969),
    ("The Left Hand of Darkness", "Ursula K. Le Guin", "978-0441478125", "Gender and politics on an alien world.", "Science Fiction", "Ace Books", 1969),
    ("Do Androids Dream of Electric Sheep?", "Philip K. Dick", "978-0345404473", "Bounty hunter questions what it means to be human.", "Science Fiction", "Del Rey", 1968),
    # Mystery & Thriller (10)
    ("Gone Girl", "Gillian Flynn", "978-0307588371", "Twisted tale of a marriage gone wrong.", "Mystery", "Crown", 2012),
    ("The Girl with the Dragon Tattoo", "Stieg Larsson", "978-0307454546", "Swedish mystery of a missing girl.", "Mystery", "Vintage", 2005),
    ("The Da Vinci Code", "Dan Brown", "978-0307474278", "Symbologist unravels a religious mystery.", "Thriller", "Anchor", 2003),
    ("And Then There Were None", "Agatha Christie", "978-0062073488", "Ten strangers trapped on an island.", "Mystery", "William Morrow", 1939),
    ("The Silent Patient", "Alex Michaelides", "978-1250301697", "Psychotherapist treats a woman who shot her husband.", "Thriller", "Celadon Books", 2019),
    ("In the Woods", "Tana French", "978-0143113492", "Dublin detective revisits childhood trauma.", "Mystery", "Penguin", 2007),
    ("The Girl on the Train", "Paula Hawkins", "978-1594634024", "A woman becomes entangled in a missing persons case.", "Thriller", "Riverhead Books", 2015),
    ("Big Little Lies", "Liane Moriarty", "978-0399587191", "Dark secrets behind a school trivia night.", "Mystery", "Berkley", 2014),
    ("Sharp Objects", "Gillian Flynn", "978-0307341556", "Journalist returns to her hometown to cover murders.", "Thriller", "Crown", 2006),
    ("The Woman in the Window", "A.J. Finn", "978-0062678416", "Agoraphobic woman witnesses a crime.", "Thriller", "William Morrow", 2018),
    # Science & Nature (10)
    ("A Brief History of Time", "Stephen Hawking", "978-0553380163", "Cosmology for the general reader.", "Science", "Bantam", 1988),
    ("Cosmos", "Carl Sagan", "978-0345539434", "Journey through the universe.", "Science", "Ballantine", 1980),
    ("The Selfish Gene", "Richard Dawkins", "978-0198788607", "Gene-centered view of evolution.", "Science", "Oxford UP", 1976),
    ("Silent Spring", "Rachel Carson", "978-0618249060", "Landmark work on pesticide dangers.", "Science", "Mariner", 1962),
    ("Sapiens", "Yuval Noah Harari", "978-0062316097", "Brief history of humankind.", "Science", "Harper", 2011),
    ("The Origin of Species", "Charles Darwin", "978-0451529060", "Foundation of evolutionary biology.", "Science", "Signet Classics", 1859),
    ("Thinking, Fast and Slow", "Daniel Kahneman", "978-0374533557", "Two systems that drive how we think.", "Science", "FSG", 2011),
    ("The Gene", "Siddhartha Mukherjee", "978-1476733524", "History and future of the human genome.", "Science", "Scribner", 2016),
    ("Astrophysics for People in a Hurry", "Neil deGrasse Tyson", "978-0393609394", "Essential astrophysics distilled.", "Science", "Norton", 2017),
    ("The Emperor of All Maladies", "Siddhartha Mukherjee", "978-1439170915", "Biography of cancer.", "Science", "Scribner", 2010),
    # Technology & CS (10)
    ("Clean Code", "Robert C. Martin", "978-0132350884", "Handbook of agile software craftsmanship.", "Technology", "Prentice Hall", 2008),
    ("Design Patterns", "Erich Gamma et al.", "978-0201633610", "Elements of reusable OO software.", "Technology", "Addison-Wesley", 1994),
    ("The Pragmatic Programmer", "David Thomas & Andrew Hunt", "978-0135957059", "Journey to software mastery.", "Technology", "Addison-Wesley", 2019),
    ("Structure and Interpretation of Computer Programs", "Harold Abelson & Gerald Sussman", "978-0262510875", "Classic CS textbook using Scheme.", "Technology", "MIT Press", 1996),
    ("Cracking the Coding Interview", "Gayle Laakmann McDowell", "978-0984782857", "189 programming questions and solutions.", "Technology", "CareerCup", 2015),
    ("Introduction to Algorithms", "Thomas Cormen et al.", "978-0262033848", "Comprehensive algorithms textbook.", "Technology", "MIT Press", 2009),
    ("The Mythical Man-Month", "Frederick Brooks", "978-0201835953", "Essays on software engineering.", "Technology", "Addison-Wesley", 1975),
    ("Code Complete", "Steve McConnell", "978-0735619678", "Practical handbook of software construction.", "Technology", "Microsoft Press", 2004),
    ("Refactoring", "Martin Fowler", "978-0134757599", "Improving the design of existing code.", "Technology", "Addison-Wesley", 2018),
    ("You Don't Know JS", "Kyle Simpson", "978-1491924464", "Deep dive into JavaScript mechanics.", "Technology", "O'Reilly", 2015),
    # History & Politics (10)
    ("Guns, Germs, and Steel", "Jared Diamond", "978-0393354324", "Why some civilizations conquered others.", "History", "Norton", 1997),
    ("The Art of War", "Sun Tzu", "978-1590302255", "Ancient Chinese military strategy.", "History", "Shambhala", -500),
    ("A People's History of the United States", "Howard Zinn", "978-0062397348", "US history from the perspective of the marginalized.", "History", "Harper Perennial", 1980),
    ("Educated", "Tara Westover", "978-0399590504", "Memoir of escaping a survivalist family.", "History", "Random House", 2018),
    ("The Diary of a Young Girl", "Anne Frank", "978-0553296983", "Diary from hiding during the Holocaust.", "History", "Bantam", 1947),
    ("Unbroken", "Laura Hillenbrand", "978-0812974492", "WWII survival and resilience.", "History", "Random House", 2010),
    ("Team of Rivals", "Doris Kearns Goodwin", "978-0743270755", "Lincoln and his cabinet.", "History", "Simon & Schuster", 2005),
    ("1776", "David McCullough", "978-0743226721", "The year of American independence.", "History", "Simon & Schuster", 2005),
    ("The Wright Brothers", "David McCullough", "978-1476728759", "Story of aviation pioneers.", "History", "Simon & Schuster", 2015),
    ("Becoming", "Michelle Obama", "978-1524763138", "Memoir of the former First Lady.", "History", "Crown", 2018),
    # Philosophy & Psychology (8)
    ("Meditations", "Marcus Aurelius", "978-0140449334", "Stoic philosophy from a Roman emperor.", "Philosophy", "Penguin Classics", 180),
    ("The Republic", "Plato", "978-0140455113", "Foundational work on justice and the ideal state.", "Philosophy", "Penguin Classics", -380),
    ("Man's Search for Meaning", "Viktor Frankl", "978-0807014295", "Finding purpose through suffering.", "Philosophy", "Beacon Press", 1946),
    ("The Art of Happiness", "Dalai Lama", "978-1573228121", "Buddhist wisdom for modern life.", "Philosophy", "Riverhead", 1998),
    ("Thus Spoke Zarathustra", "Friedrich Nietzsche", "978-0140441185", "Philosophical novel on the Übermensch.", "Philosophy", "Penguin Classics", 1883),
    ("Atomic Habits", "James Clear", "978-0735211292", "Tiny changes, remarkable results.", "Psychology", "Avery", 2018),
    ("The Power of Habit", "Charles Duhigg", "978-0812981605", "Why we do what we do.", "Psychology", "Random House", 2012),
    ("Quiet", "Susan Cain", "978-0307352156", "The power of introverts.", "Psychology", "Broadway", 2012),
    # Business & Economics (8)
    ("The Lean Startup", "Eric Ries", "978-0307887894", "Build-measure-learn for startups.", "Business", "Crown Business", 2011),
    ("Zero to One", "Peter Thiel", "978-0804139298", "Notes on startups and building the future.", "Business", "Crown Business", 2014),
    ("Rich Dad Poor Dad", "Robert Kiyosaki", "978-1612680194", "Financial literacy through two dads.", "Business", "Plata Publishing", 1997),
    ("Good to Great", "Jim Collins", "978-0066620992", "Why some companies make the leap.", "Business", "HarperBusiness", 2001),
    ("The Innovator's Dilemma", "Clayton Christensen", "978-0062060242", "Disruptive innovation theory.", "Business", "HarperBusiness", 1997),
    ("Freakonomics", "Steven Levitt & Stephen Dubner", "978-0060731335", "The hidden side of everything.", "Economics", "William Morrow", 2005),
    ("Thinking in Bets", "Annie Duke", "978-0735216372", "Making smarter decisions with uncertainty.", "Business", "Portfolio", 2018),
    ("The Black Swan", "Nassim Nicholas Taleb", "978-0812973815", "Impact of the highly improbable.", "Economics", "Random House", 2007),
    # Mathematics (7)
    ("Gödel, Escher, Bach", "Douglas Hofstadter", "978-0465026562", "Exploration of minds, machines, and math.", "Mathematics", "Basic Books", 1979),
    ("Flatland", "Edwin Abbott", "978-0486272634", "Mathematical satire about dimensions.", "Mathematics", "Dover", 1884),
    ("The Art of Problem Solving Vol. 1", "Sandor Lehoczky & Richard Rusczyk", "978-0977304561", "Foundations of mathematical problem solving.", "Mathematics", "AoPS", 2006),
    ("How to Solve It", "George Polya", "978-0691164076", "Classic guide to mathematical thinking.", "Mathematics", "Princeton UP", 1945),
    ("Fermat's Enigma", "Simon Singh", "978-0385493628", "Story of Fermat's Last Theorem proof.", "Mathematics", "Anchor", 1997),
    ("The Joy of x", "Steven Strogatz", "978-0544105850", "Guided tour of math from 1 to infinity.", "Mathematics", "Mariner", 2012),
    ("Infinite Powers", "Steven Strogatz", "978-1328879981", "How calculus reveals the secrets of the universe.", "Mathematics", "Mariner", 2019),
]


async def seed():
    """Populate database with initial data. Idempotent."""
    await init_db()

    async with async_session() as db:
        # Check if already seeded
        result = await db.execute(select(func.count(User.id)))
        if result.scalar_one() > 0:
            print("Database already seeded. Skipping.")
            return

        # ─── Users ───
        users = {}
        for u in SEED_USERS:
            user = User(
                username=u["username"],
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=_bcrypt.hashpw(u["password"].encode(), _bcrypt.gensalt()).decode(),
                role=u["role"],
            )
            db.add(user)
            users[u["username"]] = user

        await db.flush()  # Get IDs assigned
        print(f"Created {len(users)} users.")

        # ─── Books ───
        random.seed(42)  # Reproducible copy counts
        books = []
        for title, author, isbn, desc, category, publisher, year in SEED_BOOKS:
            copies = random.randint(1, 5)
            book = Book(
                title=title,
                author=author,
                isbn=isbn,
                description=desc,
                category=category,
                publisher=publisher,
                publication_year=year,
                total_copies=copies,
                available_copies=copies,
            )
            db.add(book)
            books.append(book)

        await db.flush()
        print(f"Created {len(books)} books.")

        # ─── Sample Loans ───
        member = users["member"]
        now = datetime.now(timezone.utc)

        loan_configs = [
            # (book_index, days_ago_borrowed, is_overdue)
            (0, 10, False),   # 1984 — borrowed 10 days ago, due in 4 days
            (2, 5, False),    # Great Gatsby — borrowed 5 days ago, due in 9 days
            (25, 20, True),   # Dune — borrowed 20 days ago, overdue by 6 days
            (50, 18, True),   # A Brief History of Time — overdue by 4 days
            (70, 3, False),   # Clean Code — borrowed 3 days ago, due in 11 days
        ]

        for book_idx, days_ago, is_overdue in loan_configs:
            book = books[book_idx]
            borrowed_at = now - timedelta(days=days_ago)
            due_date = borrowed_at + timedelta(days=14)
            loan = Loan(
                user_id=member.id,
                book_id=book.id,
                borrowed_at=borrowed_at,
                due_date=due_date,
                is_active=True,
            )
            db.add(loan)
            # Decrement availability
            book.available_copies = max(0, book.available_copies - 1)

        await db.commit()
        print(f"Created {len(loan_configs)} sample loans (2 overdue).")
        print("Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
