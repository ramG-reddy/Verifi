from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import re
from typing import List

MODEL_PATH = os.environ.get("ML_MODEL_PATH", os.path.join(os.path.dirname(__file__), "model.joblib"))

app = FastAPI(
    title="Financial Fraud Detection API",
    description="API for detecting fraudulent financial advice using ML",
    version="1.0.0"
)

# Global variable for model
model = None

class ScoreRequest(BaseModel):
    text: str
    
    class Config:
        schema_extra = {
            "example": {
                "text": "Guaranteed 25% returns in 2 weeks! Join our Telegram group for insider tips."
            }
        }

class ScoreResponse(BaseModel):
    text: str
    fraud_probability: float
    prediction: str
    confidence_level: str
    risk_indicators: List[str]
    
    class Config:
        schema_extra = {
            "example": {
                "text": "Sample text",
                "fraud_probability": 0.85,
                "prediction": "FRAUDULENT",
                "confidence_level": "HIGH",
                "risk_indicators": ["Guaranteed returns promised", "Urgency tactics"]
            }
        }

def extract_risk_indicators(text: str) -> List[str]:
    """Extract specific risk indicators from text"""
    indicators = []
    text_lower = text.lower()
    
    # Guaranteed returns and risk-free promises
    if re.search(r'\b(guaranteed|assured|risk[-\s]?free|100%[-\s]?safe|zero[-\s]?risk)\b', text_lower):
        indicators.append("Guaranteed/risk-free returns promised")
    
    # Urgency and pressure tactics
    if re.search(r'\b(urgent|hurry|limited[-\s]?time|last[-\s]?chance|act[-\s]?now|immediate|today[-\s]?only|expires)\b', text_lower):
        indicators.append("Urgency and pressure tactics")
    
    # Suspicious communication channels
    if re.search(r'\b(telegram|whatsapp|join[-\s]?group|premium[-\s]?group|vip[-\s]?group)\b', text_lower):
        indicators.append("Suspicious communication channels")
    
    # Direct payment requests
    if re.search(r'\b(send[-\s]?money|pay[-\s]?now|processing[-\s]?fee|registration[-\s]?fee|@paytm|@phonepe|@upi)\b', text_lower):
        indicators.append("Direct payment requests")
    
    # Pre-IPO and insider trading claims
    if re.search(r'\b(pre[-\s]?ipo|insider[-\s]?(trading|tips|information)|exclusive[-\s]?allocation|secret[-\s]?(tips|formula))\b', text_lower):
        indicators.append("Pre-IPO or insider trading claims")
    
    # Unrealistic return percentages (>20% in short timeframe)
    high_returns = re.findall(r'(\d+)%', text)
    if high_returns and any(int(r) > 20 for r in high_returns if r.isdigit()):
        max_return = max(int(r) for r in high_returns if r.isdigit())
        indicators.append(f"Unrealistic return percentage ({max_return}%)")
    
    # Short timeframe promises
    if re.search(r'\b(daily|24[-\s]?hours?|1[-\s]?week|2[-\s]?weeks?|few[-\s]?days)\b.*\b(profit|returns?|money)\b', text_lower):
        indicators.append("Short-term high return promises")
    
    # Celebrity or authority false endorsements
    if re.search(r'\b(warren[-\s]?buffett|rbi[-\s]?governor|sebi[-\s]?insider|government[-\s]?scheme)\b', text_lower):
        indicators.append("False authority endorsements")
    
    # Get-rich-quick schemes
    if re.search(r'\b(get[-\s]?rich[-\s]?quick|become[-\s]?millionaire|double[-\s]?money|money[-\s]?doubling)\b', text_lower):
        indicators.append("Get-rich-quick scheme indicators")
    
    return indicators

def get_confidence_level(probability: float) -> str:
    """Determine confidence level based on probability"""
    if probability > 0.8:
        return "HIGH"
    elif probability > 0.6:
        return "MEDIUM"
    elif probability > 0.4:
        return "LOW"
    else:
        return "VERY_LOW"

def get_prediction_label(probability: float) -> str:
    """Get prediction label based on probability"""
    return "FRAUDULENT" if probability > 0.5 else "LEGITIMATE"

@app.on_event("startup")
async def load_model():
    """Load the ML model on startup"""
    global model
    
    try:
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            print(f"✅ Model loaded successfully from: {MODEL_PATH}")
        else:
            print(f"❌ Model file not found at: {MODEL_PATH}")
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
    except Exception as e:
        print(f"❌ Error loading model: {str(e)}")
        raise

@app.post("/score", response_model=ScoreResponse)
async def score_text(request: ScoreRequest):
    """Score text for fraud probability"""
    global model
    
    if model is None:
        raise HTTPException(
            status_code=503, 
            detail="ML model not available. Please check server logs."
        )
    
    try:
        # Input validation
        if not request.text or not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail="Text input cannot be empty"
            )
        
        # Get ML prediction
        probabilities = model.predict_proba([request.text])[0]
        fraud_probability = float(probabilities[1])  # Probability of fraud (class 1)
        
        # Get prediction and confidence
        prediction = get_prediction_label(fraud_probability)
        confidence_level = get_confidence_level(fraud_probability)
        
        # Extract risk indicators
        risk_indicators = extract_risk_indicators(request.text)
        
        return ScoreResponse(
            text=request.text[:100] + "..." if len(request.text) > 100 else request.text,
            fraud_probability=round(fraud_probability, 4),
            prediction=prediction,
            confidence_level=confidence_level,
            risk_indicators=risk_indicators
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error during prediction: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy" if model is not None else "unhealthy",
        "service": "Financial Fraud Detection API",
        "model_loaded": model is not None,
        "version": "1.0.0"
    }

@app.get("/model-info")
async def get_model_info():
    """Get information about the loaded model"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Get model type
        model_type = type(model.named_steps['classifier']).__name__
        
        # Get feature count
        feature_count = len(model.named_steps['tfidf'].get_feature_names_out())
        
        return {
            "model_type": model_type,
            "feature_count": feature_count,
            "pipeline_steps": list(model.named_steps.keys()),
            "model_path": MODEL_PATH
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting model info: {str(e)}"
        )

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Financial Fraud Detection API",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0"
    }

# Add error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Endpoint not found", "available_endpoints": ["/", "/docs", "/health", "/score", "/model-info"]}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return {"error": "Internal server error", "message": "Please check server logs for details"}
