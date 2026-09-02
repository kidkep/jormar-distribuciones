from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.quote import Quote, QuoteItem


class QuoteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, quote_id: int) -> Quote | None:
        result = await self.db.execute(
            select(Quote)
            .options(selectinload(Quote.items).selectinload(QuoteItem.product), selectinload(Quote.client), selectinload(Quote.user))
            .where(Quote.id == quote_id)
        )
        return result.unique().scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Quote], int]:
        query = select(Quote).options(
            selectinload(Quote.items).selectinload(QuoteItem.product),
            selectinload(Quote.client),
            selectinload(Quote.user),
        )

        count_query = select(func.count()).select_from(Quote)
        if search:
            filter_condition = Quote.quote_number.ilike(f"%{search}%") | Quote.client_name.ilike(f"%{search}%")
            query = query.where(filter_condition)
            count_query = count_query.where(filter_condition)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.order_by(Quote.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        quotes = list(result.unique().scalars().all())

        return quotes, total or 0

    async def get_next_quote_number(self) -> str:
        result = await self.db.execute(
            select(Quote.quote_number).order_by(Quote.id.desc()).limit(1)
        )
        last = result.scalar_one_or_none()
        if last:
            try:
                num = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"COT-{num:06d}"

    async def create(self, quote: Quote) -> Quote:
        self.db.add(quote)
        await self.db.commit()
        await self.db.refresh(quote)
        return quote

    async def update(self, quote: Quote) -> Quote:
        await self.db.commit()
        await self.db.refresh(quote)
        return quote
