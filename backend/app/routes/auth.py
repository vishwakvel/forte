from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.config import settings
from app.services import auth as auth_svc
from app.services import spotify as spotify_svc
from app.deps import get_current_user
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
async def login():
    state = auth_svc.create_state()
    return RedirectResponse(spotify_svc.auth_url(state))


@router.get("/callback")
async def callback(code: str = Query(...), state: str = Query(...)):
    if not auth_svc.verify_state(state):
        raise HTTPException(400, "Invalid state")
    user, token = await auth_svc.handle_callback(code)
    return RedirectResponse(f"{settings.frontend_url}/auth/callback?token={token}")


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user
