from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from routes.auth_routes import router as auth_router
from routes.ask_routes import router as ask_router
from routes.image_routes import router as image_router
from routes.grammar_routes import router as grammar_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    from services.ai_service import model as ai_model
    from services.grammar_service import grammar_model
    print("✅ AI models loaded and ready.")
    yield
    print("🛑 Shutting down.")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later replace with your Vercel frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ask_router)
app.include_router(image_router)
app.include_router(grammar_router)

@app.get("/")
def root():
    return {"message": "AI Homework Backend is running 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}