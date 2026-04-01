from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import os
import psycopg2
from psycopg2.extras import RealDictCursor

# --- CONFIGURATION ---
ADMIN_WHITELIST = ["mwanglewis6@gmail.com", "patrickkimani1030@gmail.com"]
POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://user:pass@localhost:5432/db")

app = FastAPI(title="Ʇ-Tech | Master Build API")

# CORS for local and Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE UTILS ---
def get_db_connection():
    try:
        conn = psycopg2.connect(POSTGRES_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Postgres Connection Error: {e}")
        raise HTTPException(status_code=500, detail="Database connectivity failure.")

# Auto-provision tables on startup
@app.on_event("startup")
def startup():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Create Users
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_verified BOOLEAN DEFAULT FALSE,
            role TEXT DEFAULT 'client'
        );
    """)
    
    # Create Service Requests
    cur.execute("""
        CREATE TABLE IF NOT EXISTS service_requests (
            id SERIAL PRIMARY KEY,
            user_email TEXT NOT NULL,
            service_type TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    conn.commit()
    cur.close()
    conn.close()

# --- SCHEMAS ---
class UserAuth(BaseModel):
    email: EmailStr
    password: str

class ServiceRequest(BaseModel):
    email: str
    service_type: str
    description: str

# --- AUTH ENDPOINTS ---
@app.get("/")
async def root():
    return {"message": "Welcome to Ʇ-Tech. Service requests are now online."}

@app.post("/api/register")
async def register(req: UserAuth):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Assign role based on whitelist
        role = "admin" if req.email in ADMIN_WHITELIST else "client"
        cur.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s)",
            (req.email, req.password, role) # Simple password storage for demo
        )
        conn.commit()
        return {"message": f"Specialist registered as {role}. Redirecting to eco..."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Registration failed. specialist account exists.")
    finally:
        cur.close()
        conn.close()

@app.post("/api/login")
async def login(req: UserAuth):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s AND password_hash = %s", (req.email, req.password))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Security Secret Invalid.")
    
    # Check if verified (default true for demo to avoid email auth blockage)
    if not user['is_verified'] and user['email'] not in ADMIN_WHITELIST:
         return {"verified": False, "email": user['email']}

    return {
        "verified": True,
        "is_admin": user['role'] == "admin",
        "email": user['email']
    }

@app.post("/api/verify")
async def verify(email: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE users SET is_verified = TRUE WHERE email = %s", (email,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Email Verified. Specialist permissions granted."}

# --- SERVICE ENDPOINTS ---
@app.post("/api/submit")
async def submit_request(req: ServiceRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Check verification status first
    cur.execute("SELECT is_verified FROM users WHERE email = %s", (req.email,))
    user = cur.fetchone()
    if not user or not user['is_verified']:
        cur.close()
        conn.close()
        raise HTTPException(status_code=403, detail="Verification Required to access The Vault.")
    
    cur.execute(
        "INSERT INTO service_requests (user_email, service_type, description) VALUES (%s, %s, %s)",
        (req.email, req.service_type, req.description)
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Logged in The Vault. Specialist has been notified."}

@app.get("/api/admin/requests")
async def get_admin_data(admin_email: Optional[str] = Header(None)):
    if admin_email not in ADMIN_WHITELIST:
        raise HTTPException(status_code=403, detail="Admin authorization failed.")
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM service_requests ORDER BY created_at DESC")
    requests = cur.fetchall()
    cur.close()
    conn.close()
    return requests
