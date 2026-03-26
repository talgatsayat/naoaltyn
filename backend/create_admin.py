import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole

async def create():
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == 'admin@mail.com'))
        if existing.scalar_one_or_none():
            print('Admin already exists: admin@mail.com')
            return
        user = User(
            email='admin@mail.com',
            password_hash=hash_password('admin123'),
            first_name='Admin',
            last_name='Admin',
            role=UserRole.admin,
            is_verified=True
        )
        db.add(user)
        await db.commit()
        print('Admin created: admin@mail.com / admin123')

asyncio.run(create())
