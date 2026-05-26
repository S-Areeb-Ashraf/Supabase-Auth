import os
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")  # Use the PUBLIC anon key here
APP_URL = os.getenv("APP_URL", "http://localhost:5173")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env")

app = FastAPI(title="Supabase Auth Minimal Test")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
security = HTTPBearer()

# Pydantic schemas for request bodies
class UserAuth(BaseModel):
    email: EmailStr
    password: str

class NoteCreate(BaseModel):
    content: str

# Helper to get a standard master client (uses anon key)
def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# Dependency to extract JWT, verify it via Supabase, and return a user-scoped client
# def get_user_client(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Client:
#     token = credentials.credentials
#     try:
#         # Create a transient client scoped specifically to THIS user's token
#         user_client = create_client(SUPABASE_URL, SUPABASE_KEY)
#         user_client.postgrest.auth(token) 
        
#         # Quick sanity check: Ask Supabase who this token belongs to
#         # If the token is fake or expired, this will throw an error
#         user_client.auth.get_user(token)
        
#         return user_client
#     except Exception:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid or expired authentication token",
#         )


def get_user_client(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Client:
    token = credentials.credentials

    try:
        # Validate the JWT against Supabase Auth first.
        auth_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        auth_client.auth.get_user(token)

        # Bind the JWT to all downstream requests so RLS sees the user context.
        options = ClientOptions(headers={"Authorization": f"Bearer {token}"})
        return create_client(SUPABASE_URL, SUPABASE_KEY, options=options)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )

# --- ENDPOINTS ---

@app.post("/signup")
def signup(user: UserAuth, request: Request, db: Client = Depends(get_supabase)):
    try:
        redirect_to = request.headers.get("origin") or APP_URL
        res = db.auth.sign_up(
            {
                "email": user.email,
                "password": user.password,
                "options": {"email_redirect_to": redirect_to},
            }
        )
        if res.user is None:
            return {"message": "Signup initiated. Check your email to confirm."}
        return {"message": "Signup successful!", "user_id": res.user.id}
    except Exception as e:
        message = str(e)
        if "Invalid path specified in request URL" in message:
            message = (
                "Supabase rejected the redirect URL. Add the request Origin or APP_URL "
                "to Auth > URL Configuration > Redirect URLs in Supabase."
            )
        raise HTTPException(status_code=400, detail=message)

@app.post("/login")
def login(user: UserAuth, db: Client = Depends(get_supabase)):
    try:
        res = db.auth.sign_in_with_password({"email": user.email, "password": user.password})
        # This access_token is the JWT you need to pass to protected routes
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/notes")
def create_note(note: NoteCreate, user_db: Client = Depends(get_user_client)):
    # Because user_db uses the user's token, RLS will automatically apply their user_id
    try:
        res = user_db.table("secret_notes").insert({"content": note.content}).execute()
        return {"message": "Note saved successfully!", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/notes")
def get_notes(user_db: Client = Depends(get_user_client)):
    # RLS ensures this query only returns rows belonging to the token holder
    try:
        res = user_db.table("secret_notes").select("*").execute()
        return {"notes": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))