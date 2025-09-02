import os, pandas as pd, joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

DATA_PATH = os.environ.get("TRAIN_DATA", "/app/data/train.csv")
MODEL_PATH = os.environ.get("ML_MODEL_PATH", "/app/models/model.joblib")
NSE_DATA = os.environ.get("NSE_DATA", "/data/NSE_COMPANIES.csv")
BSE_DATA = os.environ.get("BSE_DATA", "/data/BSE_COMPANIES.csv")
SEBI_DATA = os.environ.get("SEBI_DATA", "/data/SEBI_REGISTERED_ADVISORS.csv")
COMPANIES_DATA = os.environ.get("COMPANIES_DATA", "/data/TOP_500_COMPANIES.csv")

def load_legitimate_companies():
    """Load legitimate companies from NSE and BSE data"""
    companies = set()
    
    # Load NSE companies
    if os.path.exists(NSE_DATA):
        try:
            nse_df = pd.read_csv(NSE_DATA)
            # Handle different possible column names
            name_cols = ['COMPANY NAME', 'Company Name', 'NAME OF COMPANY', 'Symbol', 'SYMBOL', 'Trading Member Name']
            for col in name_cols:
                if col in nse_df.columns:
                    companies.update(nse_df[col].dropna().astype(str).str.upper().tolist())
                    break
        except Exception as e:
            print(f"Error loading NSE data: {e}")
    
    # Load BSE companies
    if os.path.exists(BSE_DATA):
        try:
            bse_df = pd.read_csv(BSE_DATA)
            # Handle different possible column names
            name_cols = ['Security Name', 'Company Name', 'COMPANY NAME', 'Security Id', 'SECURITY_NAME', 'Trading Member Name']
            for col in name_cols:
                if col in bse_df.columns:
                    companies.update(bse_df[col].dropna().astype(str).str.upper().tolist())
                    break
        except Exception as e:
            print(f"Error loading BSE data: {e}")

    # Load Top 500 Companies
    if os.path.exists(COMPANIES_DATA):
        try:
            top500_df = pd.read_csv(COMPANIES_DATA)
            # Handle different possible column names
            name_cols = ['Company Name', 'NAME OF COMPANY', 'Symbol']
            for col in name_cols:
                if col in top500_df.columns:
                    companies.update(top500_df[col].dropna().astype(str).str.upper().tolist())
                    break
        except Exception as e:
            print(f"Error loading Top 500 Companies data: {e}")

    return list(companies)

def load_sebi_entities():
    """Load SEBI registered entities"""
    entities = set()
    
    if os.path.exists(SEBI_DATA):
        try:
            sebi_df = pd.read_csv(SEBI_DATA)
            # Handle different possible column names
            name_cols = ['Name of the Entity', 'Entity Name', 'NAME', 'ENTITY_NAME']
            for col in name_cols:
                if col in sebi_df.columns:
                    entities.update(sebi_df[col].dropna().astype(str).str.upper().tolist())
                    break
        except Exception as e:
            print(f"Error loading SEBI data: {e}")
    
    return list(entities)

def generate_training_data():
    """Generate comprehensive training data with real entity names"""
    
    # Load legitimate entities
    legitimate_companies = load_legitimate_companies()
    sebi_entities = load_sebi_entities()
    
    # Fraudulent patterns
    fraud_patterns = [
        "Guaranteed {returns}% returns in {timeframe}! Join our premium Telegram group now!",
        "URGENT: Pre-IPO shares of {company} available. Limited time offer!",
        "Insider trading tips! Double your money in {timeframe}. Contact {contact}",
        "Risk-free investment! {return}% assured returns. Send money to {upi}",
        "Secret stock tips from SEBI insiders. Pay ₹{amount} for premium access",
        "Last chance! {company} IPO allotment guaranteed. Pay processing fee now",
        "Exclusive: Get rich quick scheme. {returns}% profit in {timeframe} guaranteed!",
        "Hot tip: Buy {company} shares before announcement. 100% profit assured",
        "Special offer: Pre-IPO allocation of {company}. Send payment immediately",
        "Guaranteed profit! Join our WhatsApp group for sure-shot tips"
    ]
    
    # Legitimate patterns
    legit_patterns = [
        "SEBI registered investment advisor. Mutual funds subject to market risks",
        "{company} is a well-established company listed on NSE/BSE",
        "Invest in diversified equity mutual funds for long-term wealth creation",
        "SIP in mutual funds can help achieve your financial goals over time",
        "Please read the offer document carefully before investing",
        "Past performance is not indicative of future returns",
        "Consult your financial advisor before making investment decisions",
        "Systematic investment plans help in rupee cost averaging",
        "SEBI registration: {reg_no}. Please verify our credentials",
        "Investments in securities market are subject to market risks"
    ]
    
    texts = []
    labels = []
    
    # Generate fraudulent samples
    for _ in range(800):
        pattern = np.random.choice(fraud_patterns)
        
        # Fill placeholders with realistic values
        text = pattern.format(
            returns=np.random.choice([15, 20, 25, 30, 40, 50, 100, 200]),
            timeframe=np.random.choice(["1 week", "2 weeks", "1 month", "few days", "24 hours"]),
            company=np.random.choice(legitimate_companies[:100] if legitimate_companies else ["XYZ Corp", "ABC Ltd"]),
            contact=f"{np.random.choice(['9876543210', '8765432109', 'invest@fake.com'])}",
            upi=f"{np.random.choice(['pay', 'trade', 'invest'])}@{np.random.choice(['okaxis', 'paytm', 'phonepe'])}",
            amount=np.random.choice([999, 1999, 4999, 9999]),
            reg_no=f"INH{np.random.randint(100000, 999999)}"
        )
        
        # Add spam characteristics
        if np.random.random() < 0.3:
            text += "!!!"
        if np.random.random() < 0.2:
            text += " HURRY UP!"
        
        texts.append(text)
        labels.append(1)  # Fraudulent
    
    # Generate legitimate samples
    for _ in range(800):
        pattern = np.random.choice(legit_patterns)
        
        text = pattern.format(
            company=np.random.choice(legitimate_companies[:100] if legitimate_companies else ["Reliance", "TCS"]),
            reg_no=f"INA{np.random.randint(100000, 999999)}"
        )
        
        texts.append(text)
        labels.append(0)  # Legitimate
    
    # Add samples with SEBI entities (legitimate)
    for entity in sebi_entities[:100]:
        texts.append(f"We are {entity}, a SEBI registered investment advisor.")
        labels.append(0)
    
    # Add samples with NSE/BSE companies (legitimate)
    for company in legitimate_companies[:100]:
        texts.append(f"Invest in {company} for long-term growth. Please consult your advisor.")
        labels.append(0)
    
    return texts, labels

def ensure_training_data():
    """Generate or load training data"""
    if not os.path.exists(DATA_PATH):
        os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
        
        print("Generating training data with real entity names...")
        texts, labels = generate_training_data()
        
        df = pd.DataFrame({"text": texts, "label": labels})
        df = df.sample(frac=1).reset_index(drop=True)  # Shuffle
        df.to_csv(DATA_PATH, index=False)
        print(f"Generated {len(df)} training samples")
    
    return pd.read_csv(DATA_PATH)

def main():
    # Generate training data
    df = ensure_training_data()
    
    print(f"Training data shape: {df.shape}")
    print(f"Label distribution:\n{df['label'].value_counts()}")
    
    # Prepare data
    X = df["text"].fillna("")
    y = df["label"].astype(int)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Create pipeline with better feature extraction
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 3),
            stop_words="english",
            min_df=2,
            max_df=0.95,
            max_features=10000,
            lowercase=True,
            strip_accents='unicode'
        )),
        ("clf", RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        ))
    ])
    
    # Train model
    print("Training model...")
    pipe.fit(X_train, y_train)
    
    # Evaluate model
    train_score = pipe.score(X_train, y_train)
    test_score = pipe.score(X_test, y_test)
    
    print(f"Training accuracy: {train_score:.3f}")
    print(f"Test accuracy: {test_score:.3f}")
    
    # Detailed evaluation
    y_pred = pipe.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Fraudulent']))
    
    # Save model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(pipe, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")
    
    # Test with sample texts
    test_samples = [
        "Guaranteed 25% returns in 2 weeks! Join our Telegram group",
        "SEBI registered investment advisor. Mutual funds subject to market risks",
        "Pre-IPO shares available! Send money to pay@paytm immediately",
        "Systematic investment in equity mutual funds for long-term goals"
    ]
    
    print("\nSample predictions:")
    for text in test_samples:
        prob = pipe.predict_proba([text])[0][1]
        prediction = "Fraudulent" if prob > 0.5 else "Legitimate"
        print(f"Text: {text[:50]}...")
        print(f"Fraud probability: {prob:.3f} ({prediction})\n")

if __name__ == "__main__":
    main()
