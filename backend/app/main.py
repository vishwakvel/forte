from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import auth, songs, ratings, collection, artists, ml

app = FastAPI(title="Forte", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(songs.router)
app.include_router(ratings.router)
app.include_router(collection.router)
app.include_router(artists.router)
app.include_router(ml.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
