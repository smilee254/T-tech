from fastapi import FastAPI, Header, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import os
from passlib.context import CryptContext

# --- CONFIGURATION ---
ADMIN_WHITELIST = ["mwanglewis6@gmail.com", "patrickkimani1030@gmail.com"]
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "T-TECH-COMMAND-2024") # Set as env var or default for dev

# --- 1. Database Connection Logic ---
DATABASE_URL = os.getenv("POSTGRES_URL", "sqlite:///./test.db")

# Vercel Serverless Fix: Ensure SQLite uses /tmp if not on Postgres
if "sqlite" in DATABASE_URL and os.getenv("VERCEL"):
    DATABASE_URL = "sqlite:////tmp/test.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- 2. Table 1: users (The Identity Vault) ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), nullable=True) # Added for WhatsApp/Contact
    password_hash = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    
    requests = relationship("ServiceRequest", back_populates="owner")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

# --- 3. Table 2: service_requests (The Mission Ledger) ---
class ServiceRequest(Base):
    __tablename__ = "service_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    service_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(20), default="Pending")
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="requests")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

# --- 4. Core Functions ---
def create_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def submit_request(db: Session, user_id: int, service_type: str, description: str):
    new_request = ServiceRequest(
        user_id=user_id,
        service_type=service_type,
        description=description
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

def get_admin_view(db: Session):
    return db.query(ServiceRequest, User).join(User, ServiceRequest.user_id == User.id).all()

# --- FastAPI Implementation ---
app = FastAPI(title="Ʇ-Tech | Professional Database & API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://t-tech.vercel.app",
        "https://*.vercel.app" # Broad Vercel compatibility
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db()

# --- Schemas ---
class AuthRequest(BaseModel):
    email: EmailStr
    password: str
    phone_number: Optional[str] = None

class RequestCreate(BaseModel):
    email: str
    service_type: str
    description: str

# --- Helper for JSON Errors ---
def error_response(message: str, status_code: int = 400):
    return JSONResponse(status_code=status_code, content={"error": message})

# --- Endpoints ---

# --- Endpoints ---

@app.get("/")
def root():
    return {"message": "Ʇ-Tech Database is Online."}

@app.post("/api/auth/public")
async def public_auth(req: AuthRequest, db: Session = Depends(get_db)):
    # 1. Check if user exists
    db_user = db.query(User).filter(User.email == req.email).first()
    
    if db_user:
        # Verify Password
        if not pwd_context.verify(req.password, db_user.password_hash):
            return error_response("Password Invalid.", 401)
        
        return {
            "redirect": "/dashboard.html",
            "email": db_user.email,
            "is_admin": db_user.is_admin
        }
    else:
        # JOIN THE MISSION (Auto-Register)
        if not req.phone_number:
            return error_response("Phone Number required for new specialists.", 400)
            
        hashed_password = pwd_context.hash(req.password)
        new_user = User(
            email=req.email,
            phone_number=req.phone_number,
            password_hash=hashed_password,
            is_admin=req.email in ADMIN_WHITELIST,
            is_verified=req.email in ADMIN_WHITELIST
        )
        
        db.add(new_user)
        db.commit()
        
        return {
            "redirect": "/dashboard.html",
            "email": new_user.email,
            "is_admin": new_user.is_admin
        }

@app.post("/api/auth/admin")
async def admin_auth(req: AuthRequest, db: Session = Depends(get_db)):
    # Strict Whitelist Check
    if req.email not in ADMIN_WHITELIST:
        return error_response("Access Denied: Not a Whitelisted Specialist.", 403)
        
    # Verify Secret Key
    if req.password != ADMIN_SECRET_KEY:
        return error_response("Specialist Secret Key Invalid.", 401)
        
    return {
        "redirect": "/admin.html",
        "email": req.email,
        "is_admin": True
    }

@app.post("/api/submit")
async def api_submit_request(req: RequestCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == req.email).first()
    if not db_user:
        return error_response("User not found.", 404)
    
    if not db_user.is_verified and not db_user.is_admin:
        return error_response("Verification Required to access The Vault.", 403)
    
    await submit_request(db, db_user.id, req.service_type, req.description)
    return {"message": "Logged in The Vault. Specialist has been notified."}

@app.get("/api/admin/requests")
async def admin_requests(admin_email: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if admin_email not in ADMIN_WHITELIST:
        return error_response("Admin authorization failed.", 403)
    
    # JOIN ServiceRequest with User to get phone_number
    results = db.query(ServiceRequest, User).join(User, ServiceRequest.user_id == User.id).all()
    
    output = []
    for req, user in results:
        output.append({
            "id": req.id,
            "user_email": user.email,
            "phone_number": user.phone_number,
            "service_type": req.service_type,
            "description": req.description,
            "status": req.status,
            "created_at": str(req.created_at)
        })
    return output

@app.patch("/api/admin/resolve/{request_id}")
async def resolve_request(request_id: int, admin_email: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if admin_email not in ADMIN_WHITELIST:
        return error_response("Unauthorized", 403)
    
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        return error_response("Request not found", 404)
    
    req.status = "Resolved"
    db.commit()
    return {"message": "Request marked as Resolved"}

@app.delete("/api/admin/delete/{request_id}")
async def delete_request(request_id: int, admin_email: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if admin_email not in ADMIN_WHITELIST:
        return error_response("Unauthorized", 403)
    
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        return error_response("Request not found", 404)
    
    db.delete(req)
    db.commit()
    return {"message": "Request purged from Vault"}

@app.post("/api/verify")
async def verify(email: str, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        return error_response("User not found.", 404)
    
    db_user.is_verified = True
    db.commit()
    return {"message": "Email Verified. Specialist permissions granted."}
