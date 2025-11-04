from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Supabase Configuration
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', '')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== Models =====

class UserProfile(BaseModel):
    id: str
    username: str
    full_name: str
    wallet_balance: float
    reputation_score: float
    created_at: datetime

class WalletTopUp(BaseModel):
    amount: float

class SendMoney(BaseModel):
    recipient_username: str
    amount: float
    note: Optional[str] = ""

class Transaction(BaseModel):
    id: str
    from_user: str
    from_user_name: str
    to_user: str
    to_user_name: str
    amount: float
    note: str
    type: str  # "send", "receive", "topup"
    status: str  # "completed", "pending", "failed"
    timestamp: datetime

# ===== Helper Functions =====

def decode_supabase_jwt(token: str) -> dict:
    """Decode and validate Supabase JWT token"""
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=[ALGORITHM],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and validate user from Supabase JWT token"""
    try:
        token = credentials.credentials
        payload = decode_supabase_jwt(token)
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Find user in MongoDB by supabase_id
        user = await db.users.find_one({"supabase_id": user_id})
        
        if user is None:
            # User not found, they need to sync first
            raise HTTPException(
                status_code=404,
                detail="User profile not found. Please sync your profile first."
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# ===== User Sync Endpoint =====

@api_router.post("/users/sync")
async def sync_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Sync Supabase user to MongoDB"""
    try:
        token = credentials.credentials
        payload = decode_supabase_jwt(token)
        
        user_id = payload.get("sub")
        email = payload.get("email")
        user_metadata = payload.get("user_metadata", {})
        full_name = user_metadata.get("full_name", email.split('@')[0])
        
        # Check if user exists in MongoDB
        existing_user = await db.users.find_one({"supabase_id": user_id})
        
        if not existing_user:
            # Create new user profile
            username = email.split('@')[0]  # Extract username from email
            
            # Check if username is taken
            username_exists = await db.users.find_one({"username": username})
            if username_exists:
                username = f"{username}_{user_id[:8]}"
            
            user_profile = {
                "supabase_id": user_id,
                "email": email,
                "username": username,
                "full_name": full_name,
                "wallet_balance": 1000.0,  # Starting balance
                "reputation_score": 75.0,  # Starting reputation
                "created_at": datetime.utcnow(),
            }
            result = await db.users.insert_one(user_profile)
            return {
                "status": "created",
                "user_id": user_id,
                "inserted_id": str(result.inserted_id)
            }
        else:
            # Update existing user profile
            await db.users.update_one(
                {"supabase_id": user_id},
                {
                    "$set": {
                        "email": email,
                        "full_name": full_name,
                    }
                }
            )
            return {
                "status": "updated",
                "user_id": user_id
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync user: {str(e)}"
        )

# ===== User Endpoints =====

@api_router.get("/user/profile", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "username": current_user["username"],
        "full_name": current_user["full_name"],
        "wallet_balance": current_user["wallet_balance"],
        "reputation_score": current_user["reputation_score"],
        "created_at": current_user["created_at"]
    }

@api_router.get("/user/search/{username}")
async def search_user(username: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "username": user["username"],
        "full_name": user["full_name"],
        "reputation_score": user["reputation_score"]
    }

# ===== Wallet Endpoints =====

@api_router.post("/wallet/topup")
async def topup_wallet(topup_data: WalletTopUp, current_user: dict = Depends(get_current_user)):
    if topup_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Update wallet balance
    new_balance = current_user["wallet_balance"] + topup_data.amount
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"wallet_balance": new_balance}}
    )
    
    # Create transaction record
    transaction = {
        "from_user": str(current_user["_id"]),
        "from_user_name": current_user["username"],
        "to_user": str(current_user["_id"]),
        "to_user_name": current_user["username"],
        "amount": topup_data.amount,
        "note": "Wallet Top-up",
        "type": "topup",
        "status": "completed",
        "timestamp": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction)
    
    return {
        "message": "Top-up successful",
        "new_balance": new_balance
    }

# ===== Transaction Endpoints =====

@api_router.post("/transaction/send")
async def send_money(transaction_data: SendMoney, current_user: dict = Depends(get_current_user)):
    if transaction_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if current_user["wallet_balance"] < transaction_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    if current_user["username"] == transaction_data.recipient_username:
        raise HTTPException(status_code=400, detail="Cannot send money to yourself")
    
    # Find recipient
    recipient = await db.users.find_one({"username": transaction_data.recipient_username})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Update balances
    new_sender_balance = current_user["wallet_balance"] - transaction_data.amount
    new_recipient_balance = recipient["wallet_balance"] + transaction_data.amount
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"wallet_balance": new_sender_balance}}
    )
    
    await db.users.update_one(
        {"_id": recipient["_id"]},
        {"$set": {"wallet_balance": new_recipient_balance}}
    )
    
    # Create transaction record
    transaction = {
        "from_user": str(current_user["_id"]),
        "from_user_name": current_user["username"],
        "to_user": str(recipient["_id"]),
        "to_user_name": recipient["username"],
        "amount": transaction_data.amount,
        "note": transaction_data.note,
        "type": "send",
        "status": "completed",
        "timestamp": datetime.utcnow()
    }
    result = await db.transactions.insert_one(transaction)
    
    return {
        "message": "Money sent successfully",
        "transaction_id": str(result.inserted_id),
        "new_balance": new_sender_balance
    }

@api_router.get("/transactions")
async def get_transactions(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    # Find all transactions where user is sender or recipient
    transactions = await db.transactions.find({
        "$or": [
            {"from_user": user_id},
            {"to_user": user_id}
        ]
    }).sort("timestamp", -1).to_list(length=100)
    
    result = []
    for tx in transactions:
        # Determine transaction type from user's perspective
        if tx["from_user"] == user_id:
            if tx["type"] == "topup":
                tx_type = "topup"
            else:
                tx_type = "send"
        else:
            tx_type = "receive"
        
        result.append({
            "id": str(tx["_id"]),
            "from_user": tx["from_user"],
            "from_user_name": tx["from_user_name"],
            "to_user": tx["to_user"],
            "to_user_name": tx["to_user_name"],
            "amount": tx["amount"],
            "note": tx["note"],
            "type": tx_type,
            "status": tx["status"],
            "timestamp": tx["timestamp"]
        })
    
    return result

# Mount the API router
app.include_router(api_router)

@app.get("/")
async def root():
    return {"message": "VeloraPay API with Supabase Authentication"}
