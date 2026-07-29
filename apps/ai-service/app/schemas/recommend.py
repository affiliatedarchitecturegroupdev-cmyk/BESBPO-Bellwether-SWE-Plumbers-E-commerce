from pydantic import BaseModel


class RecommendationRequest(BaseModel):
    product_id: str
    limit: int = 4


class RecommendedProduct(BaseModel):
    product_id: str
    name: str
    slug: str
    reason: str  # "frequently bundled together" | "same category" — shown to the user, not hidden


class RecommendationResponse(BaseModel):
    product_id: str
    recommendations: list[RecommendedProduct]
