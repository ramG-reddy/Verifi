from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import pandas as pd
import re
from typing import Dict, List

MODEL_PATH = os.environ.get("ML_MODEL_PATH", "/app/models/model.joblib")
# NSE_DATA = os.environ.get("NSE_DATA", "/data/NSE_COMPANIES.csv")
# BSE_DATA = os.environ.get("BSE_DATA", "/data/BSE_COMPANIES.csv")

app = FastAPI(title="Financial Fraud Detection API")

# Global variables for model and company data
pipe = None
# legitimate_companies = set()

class ScoreRequest(BaseModel):
    text: str

# class CompanyVerifyRequest(BaseModel):
#     company_name: str

class ScoreResponse(BaseModel):
    ml_score: float
    risk_indicators: List[str]

# def load_legitimate_companies():
#     """Load legitimate companies from NSE and BSE data"""
#     companies = set()
    
#     # Load NSE companies
#     if os.path.exists(NSE_DATA):
#         try:
#             nse_df = pd.read_csv(NSE_DATA)
#             name_cols = ['COMPANY NAME', 'Company Name', 'NAME OF COMPANY', 'Symbol', 'SYMBOL']
#             for col in name_cols:
#                 if col in nse_df.columns:
#                     companies.update(nse_df[col].dropna().astype(str).str.upper().tolist())
#                     break
#             print(f"Loaded {len(companies)} NSE companies")
#         except Exception as e:
#             print(f"Error loading NSE data: {e}")
    
#     # Load BSE companies
#     if os.path.exists(BSE_DATA):
#         try:
#             bse_df = pd.read_csv(BSE_DATA)
#             name_cols = ['Security Name', 'Company Name', 'COMPANY NAME', 'Security Id', 'SECURITY_NAME']
#             for col in name_cols:
#                 if col in bse_df.columns:
#                     companies.update(bse_df[col].dropna().astype(str).str.upper().tolist())
#                     break
#             print(f"Total companies after BSE: {len(companies)}")
#         except Exception as e:
#             print(f"Error loading BSE data: {e}")
    
#     return companies

def extract_risk_indicators(text: str) -> List[str]:
    """Extract specific risk indicators from text"""
    indicators = []
    
    # High return promises
    if re.search(r'guaranteed|assured|risk.?free', text, re.I):
        indicators.append("Guaranteed returns promised")
    
    # Urgency tactics
    if re.search(r'urgent|hurry|limited time|last chance|act now', text, re.I):
        indicators.append("Urgency tactics")
    
    # Suspicious contact methods
    if re.search(r'telegram|whatsapp|join.+group', text, re.I):
        indicators.append("Suspicious communication channels")
    
    # Payment requests
    if re.search(r'send money|pay.+@|upi|processing fee', text, re.I):
        indicators.append("Direct payment requests")
    
    # Pre-IPO schemes
    if re.search(r'pre.?ipo|insider|exclusive allocation', text, re.I):
        indicators.append("Pre-IPO or insider trading claims")
    
    # High percentage returns
    returns = re.findall(r'(\d+)%', text)
    if returns and any(int(r) > 15 for r in returns):
        indicators.append("Unrealistic return percentages")
    
    return indicators

@app.on_event("startup")
def load_models():
    global pipe
    # global legitimate_companies
    
    # Load ML model
    if os.path.exists(MODEL_PATH):
        pipe = joblib.load(MODEL_PATH)
        print("ML model loaded successfully")
    else:
        print("ML model not found")
    
    # # Load company data
    # legitimate_companies = load_legitimate_companies()
    # print(f"Loaded {len(legitimate_companies)} legitimate companies")

@app.post("/score", response_model=ScoreResponse)
def score_text(req: ScoreRequest):
    global pipe
    
    if pipe is None:
        raise HTTPException(status_code=503, detail="ML model not available")
    
    try:
        # Get ML prediction
        probabilities = pipe.predict_proba([req.text])[0]
        fraud_probability = float(probabilities[1])
        
        # # Determine confidence level
        # if fraud_probability > 0.8:
        #     confidence = "high"
        # elif fraud_probability > 0.6:
        #     confidence = "medium"
        # elif fraud_probability > 0.4:
        #     confidence = "low"
        # else:
        #     confidence = "very_low"
        
        # Extract risk indicators
        risk_indicators = extract_risk_indicators(req.text)
        
        return ScoreResponse(
            ml_score=fraud_probability,
            # confidence=confidence,
            risk_indicators=risk_indicators
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# @app.post("/verify_company")
# def verify_company(req: CompanyVerifyRequest):
#     """Verify if a company is listed on NSE/BSE"""
#     company_upper = req.company_name.upper().strip()
    
#     # Direct match
#     if company_upper in legitimate_companies:
#         return {"verified": True, "match_type": "exact", "company_name": req.company_name}
    
#     # Partial match
#     partial_matches = [comp for comp in legitimate_companies if company_upper in comp or comp in company_upper]
    
#     if partial_matches:
#         return {
#             "verified": True, 
#             "match_type": "partial", 
#             "company_name": req.company_name,
#             "possible_matches": partial_matches[:5]
#         }
    
#     return {"verified": False, "match_type": "none", "company_name": req.company_name}

@app.get("/health")
def health_check():
    return {
        "status": "working...",
        "model_loaded": pipe is not None,
        # "companies_loaded": len(legitimate_companies)
    }

# @app.get("/stats")
# def get_stats():
#     return {
#         "legitimate_companies_count": len(legitimate_companies),
#         "model_available": pipe is not None
#     }
