import os
import uuid
import base64
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ShikshaChain API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'shikshachain')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
universities_collection = db.universities
degrees_collection = db.degrees
students_collection = db.students

# Pydantic models
class University(BaseModel):
    id: str
    name: str
    principal_address: str
    authorized: bool = True
    created_at: Optional[datetime] = None

class Student(BaseModel):
    id: str
    name: str
    wallet_address: str
    aadhaar_id: str
    created_at: Optional[datetime] = None

class DegreeRequest(BaseModel):
    student_id: str
    student_name: str
    student_wallet_address: str
    course: str
    graduation_year: int
    university_id: str
    degree_pdf_base64: Optional[str] = None

class Degree(BaseModel):
    id: str
    degree_id: int  # NFT token ID from blockchain
    student_id: str
    student_name: str
    student_wallet_address: str
    university_id: str
    university_name: str
    course: str
    graduation_year: int
    degree_hash: str
    tx_id: Optional[str] = None  # Stacks transaction ID
    pdf_data: Optional[str] = None  # Base64 encoded PDF
    qr_code: Optional[str] = None
    created_at: Optional[datetime] = None
    verified: bool = False

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "ShikshaChain API"}

# University endpoints
@app.post("/api/universities")
async def create_university(university: University):
    try:
        # Check if university already exists
        existing = await universities_collection.find_one({"principal_address": university.principal_address})
        if existing:
            raise HTTPException(status_code=400, detail="University with this principal address already exists")
        
        university_dict = university.model_dump()
        university_dict['created_at'] = datetime.now()
        await universities_collection.insert_one(university_dict)
        logger.info(f"Created university: {university.name}")
        return {"message": "University created successfully", "university": university_dict}
    except Exception as e:
        logger.error(f"Error creating university: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/universities")
async def get_universities():
    try:
        universities = []
        async for uni in universities_collection.find():
            universities.append(uni)
        return {"universities": universities}
    except Exception as e:
        logger.error(f"Error fetching universities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/universities/{university_id}")
async def get_university(university_id: str):
    try:
        university = await universities_collection.find_one({"id": university_id})
        if not university:
            raise HTTPException(status_code=404, detail="University not found")
        return {"university": university}
    except Exception as e:
        logger.error(f"Error fetching university: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Student endpoints
@app.post("/api/students")
async def create_student(student: Student):
    try:
        # Check if student already exists
        existing = await students_collection.find_one({"$or": [{"wallet_address": student.wallet_address}, {"aadhaar_id": student.aadhaar_id}]})
        if existing:
            raise HTTPException(status_code=400, detail="Student with this wallet address or Aadhaar ID already exists")
        
        student_dict = student.model_dump()
        await students_collection.insert_one(student_dict)
        logger.info(f"Created student: {student.name}")
        return {"message": "Student created successfully", "student": student_dict}
    except Exception as e:
        logger.error(f"Error creating student: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/students/{student_id}")
async def get_student(student_id: str):
    try:
        student = await students_collection.find_one({"id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        return {"student": student}
    except Exception as e:
        logger.error(f"Error fetching student: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/students/wallet/{wallet_address}")
async def get_student_by_wallet(wallet_address: str):
    try:
        student = await students_collection.find_one({"wallet_address": wallet_address})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        return {"student": student}
    except Exception as e:
        logger.error(f"Error fetching student: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Degree endpoints
@app.post("/api/degrees/mint")
async def mint_degree(degree_request: DegreeRequest):
    try:
        # Generate unique degree ID
        degree_id = str(uuid.uuid4())
        nft_token_id = int(str(uuid.uuid4().int)[:8])  # Generate 8-digit token ID
        
        # Get university info
        university = await universities_collection.find_one({"id": degree_request.university_id})
        if not university:
            raise HTTPException(status_code=404, detail="University not found")
        
        # Create degree hash (simple hash for demo)
        degree_hash = base64.b64encode(f"{degree_request.student_name}-{degree_request.course}-{degree_request.graduation_year}".encode()).decode()
        
        # Generate QR code data (JSON string with verification info)
        qr_data = {
            "degree_id": nft_token_id,
            "student_name": degree_request.student_name,
            "course": degree_request.course,
            "university": university["name"],
            "graduation_year": degree_request.graduation_year,
            "verification_url": f"/api/degrees/verify/{nft_token_id}"
        }
        
        degree = Degree(
            id=degree_id,
            degree_id=nft_token_id,
            student_id=degree_request.student_id,
            student_name=degree_request.student_name,
            student_wallet_address=degree_request.student_wallet_address,
            university_id=degree_request.university_id,
            university_name=university["name"],
            course=degree_request.course,
            graduation_year=degree_request.graduation_year,
            degree_hash=degree_hash,
            pdf_data=degree_request.degree_pdf_base64,
            qr_code=str(qr_data),
            verified=True  # Auto-verify for demo
        )
        
        degree_dict = degree.model_dump()
        await degrees_collection.insert_one(degree_dict)
        
        logger.info(f"Minted degree NFT {nft_token_id} for student {degree_request.student_name}")
        return {
            "message": "Degree NFT minted successfully",
            "degree": degree_dict,
            "qr_data": qr_data
        }
    except Exception as e:
        logger.error(f"Error minting degree: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/degrees/verify/{degree_id}")
async def verify_degree(degree_id: int):
    try:
        degree = await degrees_collection.find_one({"degree_id": degree_id})
        if not degree:
            raise HTTPException(status_code=404, detail="Degree not found")
        
        # Get university info
        university = await universities_collection.find_one({"id": degree["university_id"]})
        
        verification_data = {
            "degree_id": degree["degree_id"],
            "student_name": degree["student_name"],
            "course": degree["course"],
            "university": degree["university_name"],
            "graduation_year": degree["graduation_year"],
            "issue_date": degree["created_at"],
            "verified": degree["verified"],
            "student_wallet": degree["student_wallet_address"],
            "university_authorized": university["authorized"] if university else False
        }
        
        return {"verification": verification_data}
    except Exception as e:
        logger.error(f"Error verifying degree: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/degrees/student/{student_id}")
async def get_student_degrees(student_id: str):
    try:
        degrees = []
        async for degree in degrees_collection.find({"student_id": student_id}):
            degrees.append(degree)
        return {"degrees": degrees}
    except Exception as e:
        logger.error(f"Error fetching student degrees: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/degrees/wallet/{wallet_address}")
async def get_degrees_by_wallet(wallet_address: str):
    try:
        degrees = []
        async for degree in degrees_collection.find({"student_wallet_address": wallet_address}):
            degrees.append(degree)
        return {"degrees": degrees}
    except Exception as e:
        logger.error(f"Error fetching degrees by wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/degrees")
async def get_all_degrees():
    try:
        degrees = []
        async for degree in degrees_collection.find():
            degrees.append(degree)
        return {"degrees": degrees}
    except Exception as e:
        logger.error(f"Error fetching all degrees: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Mock Aadhaar verification endpoint
@app.post("/api/auth/verify-aadhaar")
async def verify_aadhaar(aadhaar_id: str = Form(...), name: str = Form(...)):
    try:
        # Mock verification - in real implementation, this would connect to IndiaStack
        if len(aadhaar_id) == 12 and aadhaar_id.isdigit():
            return {
                "verified": True,
                "name": name,
                "aadhaar_id": aadhaar_id,
                "message": "Aadhaar verification successful"
            }
        else:
            return {
                "verified": False,
                "message": "Invalid Aadhaar number"
            }
    except Exception as e:
        logger.error(f"Error verifying Aadhaar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)