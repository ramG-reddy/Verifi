from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import re
import pandas as pd
from typing import List, Optional

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
    returns_percentage: Optional[int] = None
    timeframe: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "text": "Guaranteed 25% returns in 2 weeks! Join our Telegram group for insider tips.",
                "returns_percentage": 25,
                "timeframe": "2 weeks"
            }
        }

class ScoreResponse(BaseModel):
    # text: str
    fraud_probability: float
    prediction: str
    confidence_level: str
    risk_indicators: List[str]
    # extracted_returns: Optional[int] = None
    # extracted_timeframe: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                # "text": "Sample text",
                "fraud_probability": 0.85,
                "prediction": "FRAUDULENT",
                "confidence_level": "HIGH",
                "risk_indicators": ["Guaranteed returns promised", "Urgency tactics"],
                # "extracted_returns": 25,
                # "extracted_timeframe": "2 weeks"
            }
        }

def extract_returns_and_timeframe(text: str) -> tuple:
    """Extract returns percentage and timeframe from text"""
    text_lower = text.lower()
    
    # Extract return percentages
    returns_matches = re.findall(r'(\d+)%', text)
    extracted_returns = None
    if returns_matches:
        # Take the highest percentage mentioned
        extracted_returns = max(int(r) for r in returns_matches if r.isdigit())
    
    # Extract timeframes
    extracted_timeframe = None
    timeframe_patterns = [
        (r'\b(\d+)\s*hours?\b', 'hours'),
        (r'\b(\d+)\s*days?\b', 'days'),
        (r'\b(\d+)\s*weeks?\b', 'weeks'),
        (r'\b(\d+)\s*months?\b', 'months'),
        (r'\b(\d+)\s*years?\b', 'years'),
        (r'\bdaily\b', 'daily'),
        (r'\bweekly\b', 'weekly'),
        (r'\bmonthly\b', 'monthly'),
        (r'\bannual(?:ly)?\b', 'annual'),
        (r'\b24\s*hours?\b', '24 hours'),
        (r'\b48\s*hours?\b', '48 hours'),
        (r'\bovernight\b', 'overnight'),
        (r'\bimmediate(?:ly)?\b', 'immediate')
    ]
    
    for pattern, timeframe_type in timeframe_patterns:
        match = re.search(pattern, text_lower)
        if match:
            if timeframe_type in ['hours', 'days', 'weeks', 'months', 'years']:
                extracted_timeframe = f"{match.group(1)} {timeframe_type}"
            else:
                extracted_timeframe = timeframe_type
            break
    
    return extracted_returns, extracted_timeframe

def extract_risk_indicators(text: str, returns_percentage: Optional[int] = None, timeframe: Optional[str] = None) -> List[str]:
    """Extract specific risk indicators from text and additional fields"""
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
    if returns_percentage:
        if returns_percentage > 50:
            indicators.append(f"Extremely unrealistic return percentage ({returns_percentage}%)")
        elif returns_percentage > 20:
            indicators.append(f"Unrealistic return percentage ({returns_percentage}%)")
    
    # Short timeframe promises
    if re.search(r'\b(daily|24[-\s]?hours?|1[-\s]?week|2[-\s]?weeks?|few[-\s]?days)\b.*\b(profit|returns?|money)\b', text_lower):
        indicators.append("Short-term high return promises")
    
    # Timeframe-based risk analysis
    if timeframe:
        timeframe_lower = timeframe.lower()
        high_risk_timeframes = ['daily', 'hours', '24 hours', '48 hours', 'overnight', 'immediate']
        if any(risk_tf in timeframe_lower for risk_tf in high_risk_timeframes):
            indicators.append(f"Suspicious short timeframe ({timeframe})")
        
        # Check for unrealistic returns in short timeframes
        if returns_percentage and returns_percentage > 10:
            if any(risk_tf in timeframe_lower for risk_tf in ['daily', 'hours', 'overnight']):
                indicators.append("High returns promised in very short timeframe")
    
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
    """Score text for fraud probability with enhanced feature extraction"""
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
        
        # Extract returns and timeframe from text if not provided
        extracted_returns, extracted_timeframe = extract_returns_and_timeframe(request.text)
        
        # Use provided values or extracted ones
        returns_percentage = request.returns_percentage or extracted_returns or 0
        timeframe = request.timeframe or extracted_timeframe or 'unknown'
        
        # Prepare input data for model
        input_data = pd.DataFrame([{
            'text': request.text,
            'returns_percentage': returns_percentage,
            'timeframe': timeframe
        }])
        
        # Get ML prediction
        probabilities = model.predict_proba(input_data)[0]
        fraud_probability = float(probabilities[1])  # Probability of fraud (class 1)
        
        # Get prediction and confidence
        prediction = get_prediction_label(fraud_probability)
        confidence_level = get_confidence_level(fraud_probability)
        
        # Extract risk indicators with enhanced analysis
        risk_indicators = extract_risk_indicators(request.text, returns_percentage, timeframe)
        
        return ScoreResponse(
            # text=request.text[:100] + "..." if len(request.text) > 100 else request.text,
            fraud_probability=round(fraud_probability, 4),
            prediction=prediction,
            confidence_level=confidence_level,
            risk_indicators=risk_indicators,
            # extracted_returns=extracted_returns,
            # extracted_timeframe=extracted_timeframe
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
