from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.config import settings
from app.deps import get_current_user
from app.ml import predict, drift, embedding
from app.services import spotify as spotify_svc
from app.services.supabase import get_supabase

router = APIRouter(prefix="/ml", tags=["ml"])


def _fetch_ratings(user_id: str) -> list[dict]:
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("*, songs(*)")
        .eq("user_id", user_id)
        .execute()
    )
    return res.data or []


class PredictRequest(BaseModel):
    spotify_id: str


@router.post("/predict-rating")
async def predict_rating(req: PredictRequest, user: dict = Depends(get_current_user)):
    ratings = _fetch_ratings(user["id"])
    if len(ratings) < settings.min_ratings_for_ml:
        return {"available": False, "message": "Rate more songs to unlock"}

    audio = await spotify_svc.fetch_audio_features(user["id"], req.spotify_id)
    if not audio:
        return {"available": False, "message": "Audio features unavailable"}

    result = predict.predict(user["id"], audio)
    if not result:
        # Try training on the fly
        train_result = predict.train(user["id"], ratings)
        if not train_result:
            return {"available": False, "message": "Rate more songs to unlock"}
        result = predict.predict(user["id"], audio)

    return {"available": True, **result}


@router.post("/retrain")
async def retrain(user: dict = Depends(get_current_user)):
    ratings = _fetch_ratings(user["id"])
    if len(ratings) < settings.min_ratings_for_ml:
        return {"trained": False, "message": "Rate more songs to unlock"}
    result = predict.train(user["id"], ratings)
    return {"trained": result is not None, **(result or {})}


@router.get("/taste-drift")
async def taste_drift(user: dict = Depends(get_current_user)):
    ratings = _fetch_ratings(user["id"])
    result = drift.detect_drift(ratings)
    if not result:
        return {"available": False, "message": "Rate more songs to unlock"}
    return {"available": True, **result}


@router.get("/embedding")
async def taste_embedding(
    user: dict = Depends(get_current_user),
    before: str | None = Query(None),
):
    ratings = _fetch_ratings(user["id"])
    result = embedding.compute_embedding(ratings, before=before)
    if not result:
        return {"available": False, "message": "Rate more songs to unlock"}
    return {"available": True, **result}
