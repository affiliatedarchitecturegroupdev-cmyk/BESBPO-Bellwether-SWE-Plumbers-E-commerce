from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_session
from app.schemas.recommend import RecommendationRequest, RecommendationResponse
from app.services import recommendation_service

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.post("", response_model=RecommendationResponse)
async def recommend(req: RecommendationRequest, session: AsyncSession = Depends(get_session)):
    recommendations = await recommendation_service.recommend(session, req.product_id, req.limit)
    return RecommendationResponse(product_id=req.product_id, recommendations=recommendations)
