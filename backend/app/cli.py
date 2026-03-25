import asyncio
import typer
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole

cli = typer.Typer()

@cli.command()
def create_admin(
    email: str = typer.Option(..., prompt=True),
    password: str = typer.Option(..., prompt=True, hide_input=True),
    first_name: str = typer.Option("Admin", prompt=True),
    last_name: str = typer.Option("User", prompt=True),
):
    """Create an admin user in the database."""
    async def _create():
        async with AsyncSessionLocal() as db:
            user = User(
                email=email,
                password_hash=hash_password(password),
                first_name=first_name,
                last_name=last_name,
                role=UserRole.admin,
                is_verified=True,
            )
            db.add(user)
            await db.commit()
            print(f"Admin created: {email}")
    asyncio.run(_create())

if __name__ == "__main__":
    cli()
