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
import bcrypt
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'velorapay-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===== Models =====

class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

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

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"username": username})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== Auth Endpoints =====

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create new user
    hashed_pwd = hash_password(user_data.password)
    new_user = {
        "username": user_data.username,
        "password_hash": hashed_pwd,
        "full_name": user_data.full_name,
        "wallet_balance": 1000.0,  # Starting balance
        "reputation_score": 75.0,  # Starting reputation
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data.username})
    
    user_dict = {
        "id": str(new_user["_id"]),
        "username": new_user["username"],
        "full_name": new_user["full_name"],
        "wallet_balance": new_user["wallet_balance"],
        "reputation_score": new_user["reputation_score"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token = create_access_token(data={"sub": user_data.username})
    
    user_dict = {
        "id": str(user["_id"]),
        "username": user["username"],
        "full_name": user["full_name"],
        "wallet_balance": user["wallet_balance"],
        "reputation_score": user["reputation_score"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }

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
        "from_user": "system",
        "from_user_name": "VeloraPay",
        "to_user": str(current_user["_id"]),
        "to_user_name": current_user["full_name"],
        "amount": topup_data.amount,
        "note": "Wallet top-up",
        "type": "topup",
        "status": "completed",
        "timestamp": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction)
    
    return {
        "success": True,
        "new_balance": new_balance,
        "message": f"Successfully added ${topup_data.amount} USDC to your wallet"
    }

# ===== Transaction Endpoints =====

@api_router.post("/transaction/send")
async def send_money(send_data: SendMoney, current_user: dict = Depends(get_current_user)):
    # Validate amount
    if send_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Check sender balance
    if current_user["wallet_balance"] < send_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Find recipient
    recipient = await db.users.find_one({"username": send_data.recipient_username})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Can't send to self
    if str(recipient["_id"]) == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot send money to yourself")
    
    # Update balances
    sender_new_balance = current_user["wallet_balance"] - send_data.amount
    recipient_new_balance = recipient["wallet_balance"] + send_data.amount
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"wallet_balance": sender_new_balance}}
    )
    
    await db.users.update_one(
        {"_id": recipient["_id"]},
        {"$set": {"wallet_balance": recipient_new_balance}}
    )
    
    # Create transaction record
    transaction = {
        "from_user": str(current_user["_id"]),
        "from_user_name": current_user["full_name"],
        "to_user": str(recipient["_id"]),
        "to_user_name": recipient["full_name"],
        "amount": send_data.amount,
        "note": send_data.note,
        "type": "send",
        "status": "completed",
        "timestamp": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction)
    
    return {
        "success": True,
        "new_balance": sender_new_balance,
        "message": f"Successfully sent ${send_data.amount} USDC to {recipient['full_name']}"
    }

@api_router.get("/transaction/history", response_model=List[Transaction])
async def get_transaction_history(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    # Find all transactions where user is sender or receiver
    transactions = await db.transactions.find({
        "$or": [
            {"from_user": user_id},
            {"to_user": user_id}
        ]
    }).sort("timestamp", -1).to_list(1000)
    
    result = []
    for txn in transactions:
        # Determine transaction type from user's perspective
        if txn["from_user"] == user_id:
            txn_type = "send" if txn["type"] != "topup" else "topup"
        else:
            txn_type = "receive"
        
        result.append({
            "id": str(txn["_id"]),
            "from_user": txn["from_user"],
            "from_user_name": txn["from_user_name"],
            "to_user": txn["to_user"],
            "to_user_name": txn["to_user_name"],
            "amount": txn["amount"],
            "note": txn.get("note", ""),
            "type": txn_type,
            "status": txn["status"],
            "timestamp": txn["timestamp"]
        })
    
    return result

@api_router.get("/")
async def root():
    return {"message": "VeloraPay API v1.0", "status": "operational"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
