from fastapi import FastAPI, Header, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text, ForeignKey, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import os
import traceback
from passlib.context import CryptContext

# --- CONFIGURATION ---
ADMIN_WHITELIST = ["mwanglewis6@gmail.com", "patrickkimani1030@gmail.com"]
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY") or "T-TECH-COMMAND-2024"

def is_whitelisted(email: str) -> bool:
    if not email:
        return False
    return email.strip().lower() in [e.strip().lower() for e in ADMIN_WHITELIST]


# --- 1. Database Connection Logic ---
DATABASE_URL = os.getenv("POSTGRES_URL", "sqlite:///./t-tech-main.db")

# Force Postgres URL normalization for SQLAlchemy 2.0+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Vercel / Cloud Fix: Enable SSL for Postgres safely
if "postgresql" in DATABASE_URL and "sslmode" not in DATABASE_URL:
    # Use & if parameters already exist, else ?
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{separator}sslmode=require"

# Vercel Serverless Fix: Ensure SQLite uses /tmp
if "sqlite" in DATABASE_URL and os.getenv("VERCEL"):
    DATABASE_URL = "sqlite:////tmp/t-tech-main.db"

# Create Engine with Pooling
try:
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True, # Critical for Celeron/Serverless keep-alive
        echo=False # Set to True for DB debugging
    )
except Exception as e:
    print(f"CRITICAL: Engine Creation Failed: {e}")
    # Fallback to in-memory if everything else fails to at least allow boot
    engine = create_engine("sqlite:///:memory:")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- 2. Tables ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    
    requests = relationship("ServiceRequest", back_populates="owner")

class ServiceRequest(Base):
    __tablename__ = "service_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    service_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(20), default="Pending")
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="requests")

# --- 3. Core Functions ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 4. FastAPI Setup ---
app = FastAPI(title="Ʇ-Tech | Unified Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Crash Diagnostic
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_trace = traceback.format_exc()
    print(error_trace) # Visible in Vercel/CLI logs
    return JSONResponse(
        status_code=500,
        content={
            "error": "Mission Control Crash",
            "details": str(exc),
            "traceback": error_trace if os.getenv("DEBUG") else "Cloud-Restricted"
        }
    )

@app.on_event("startup")
def on_startup():
    try:
        # 1. Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        
        # 2. Migration Check: Ensure missing columns exist in existing tables
        with engine.connect() as conn:
            try:
                # Check for is_admin column in users
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;"))
                conn.commit()
            except Exception as e:
                print(f"Migration: Column check error (Safe to ignore if columns already exist): {e}")
    except Exception as e:
        print(f"CRITICAL STARTUP ERROR: {e}")
        # We don't re-raise here to prevent "Deployment Crash" on Vercel boot.
        # Errors will be handled/shown during individual API requests.

# --- Schemas ---
class AuthRequest(BaseModel):
    email: EmailStr
    password: str
    phone_number: Optional[str] = None

class RequestCreate(BaseModel):
    email: str
    service_type: str
    description: str

def error_response(message: str, status_code: int = 400):
    return JSONResponse(status_code=status_code, content={"error": message})

# --- Endpoints ---

@app.get("/")
def root():
    return {"message": "Ʇ-Tech Database is Online."}

@app.post("/api/auth/public")
async def public_auth(req: AuthRequest, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == req.email).first()
    
    if db_user:
        if not pwd_context.verify(req.password, db_user.password_hash):
            return error_response("Password Invalid.", 401)
        
        # Sync admin/verification status from whitelist in case it changed
        db_user.is_admin = is_whitelisted(db_user.email)
        db_user.is_verified = is_whitelisted(db_user.email) or db_user.is_verified
        db.commit()
        
        return {
            "redirect": "/dashboard.html",
            "email": db_user.email,
            "is_admin": db_user.is_admin
        }

    else:
        if not req.phone_number:
            return error_response("Phone Number required for new specialists.", 400)
            
        hashed_password = pwd_context.hash(req.password)
        new_user = User(
            email=req.email,
            phone_number=req.phone_number,
            password_hash=hashed_password,
            is_admin=is_whitelisted(req.email),
            is_verified=is_whitelisted(req.email)

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
    if not is_whitelisted(req.email):
        return error_response("Access Denied. You are not on the Mission Control Whitelist.", 403)
        
    if req.password != ADMIN_SECRET_KEY:
        return error_response("Security Secret Invalid.", 401)
        
    return {
        "redirect": "/admin.html",
        "email": req.email.strip().lower(),
        "is_admin": True
    }


@app.post("/api/submit")
async def api_submit_request(req: RequestCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == req.email).first()
    if not db_user:
        return error_response("User not found.", 404)
    
    # No verification check required for vault submission as per user request

    
    new_request = ServiceRequest(
        user_id=db_user.id,
        service_type=req.service_type,
        description=req.description
    )
    db.add(new_request)
    db.commit()
    return {"message": "Mission Logged."}

@app.get("/api/admin/requests")
async def admin_requests(admin_email: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not is_whitelisted(admin_email):
        return error_response("Auth Failed. Whitelist required.", 403)

    
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
    if not is_whitelisted(admin_email):
        return error_response("Unauthorized", 403)

    
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        return error_response("Not found", 404)
    
    req.status = "Resolved"
    db.commit()
    return {"message": "Resolved"}

@app.delete("/api/admin/delete/{request_id}")
async def delete_request(request_id: int, admin_email: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not is_whitelisted(admin_email):
        return error_response("Unauthorized", 403)

    
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        return error_response("Not found", 404)
    
    db.delete(req)
    db.commit()
    return {"message": "Purged"}

@app.post("/api/verify")
async def verify(email: str, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        return error_response("Not found", 404)
    
    db_user.is_verified = True
    db.commit()
    return {"message": "Verified"}
