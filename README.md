# Financial Fraud Checker

A unified verification platform that protects retail investors from financial fraud by providing instant credibility assessments of investment opportunities, advisors, and companies.

## 🎯 Problem Statement

In India, thousands of people lose money annually to:
- Fake investment tips and fraudulent schemes
- Unregistered financial advisors and brokers
- Non-existent companies and fake IPOs
- Scam messages promising guaranteed returns

While regulatory bodies (RBI, SEBI, NSE, BSE, MCA) publish warnings and trusted lists, this information is scattered across different portals that most retail investors don't regularly check.

## 💡 Solution

Our platform bridges this gap by creating a **single, accessible, and user-friendly verification hub** that consolidates disparate regulatory data sources into a simple tool for instant fraud detection.

## 🚀 Key Features

### 1. **Fraud Message Detector**
- Analyzes suspicious SMS/WhatsApp messages for scam keywords
- Uses ML model trained on fraudulent message patterns
- Provides percentage-based fraud score with risk indicators
- Detects common scam tactics: guaranteed returns, urgency pressure, insider tips

### 2. **Advisor/Broker Verification**
- Cross-references against official SEBI registration database
- Verifies name similarity with registered advisors
- Instant status check: "Verified" or "Not Found"
- Comprehensive advisor information display

### 3. **Company/IPO Verification**
- Validates companies against NSE/BSE listings
- Flags non-existent entities as potential scams
- Verification against exchange databases

## 👥 Target Users

- **Retail Investors**: Primary users seeking to verify investment opportunities
- **New Market Entrants**: First-time investors vulnerable to fraud
- **General Public**: Anyone receiving suspicious investment messages
- **Financial Literacy Advocates**: Organizations promoting safe investing

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Zod** - Schema validation

### Backend
- **Node.js** - Runtime environment
- **Prisma** - Database ORM and query builder
- **PostgreSQL** - Primary database
- **FastAPI** - ML service API (Python)

### Machine Learning
- **Python** - ML model development
- **Scikit-learn** - Model training and prediction
- **Pandas** - Data processing
- **Joblib** - Model serialization

### Infrastructure
- **Docker & Docker Compose** - Containerization

## 💻 Usage Examples

### 1. Checking a Suspicious Message
```
Input: "GUARANTEED 25% returns in just 2 weeks! Join our exclusive Telegram group for insider trading tips."

Output:
- Fraud Score: 85/100
- Risk Level: CRITICAL
- Red Flags: Guaranteed returns, Urgency tactics, Suspicious channels
```

### 2. Verifying an Investment Advisor
```
Input: 
- Registration ID: INA000000888
- Name: 360 ONE Investment Adviser

Output:
- Status: VERIFIED ✅
- Match Score: 95%
- Registration: ACTIVE
- Category: Corporate
```

### 3. Company Verification
```
Input: "XYZ Guaranteed Returns Pvt Ltd"

Output:
- Exchange Status: NOT LISTED ❌
- MCA Status: NOT FOUND ❌
- Fraud Score: 90/100
- Risk Level: CRITICAL
```

## 🚨 Disclaimer

This tool provides preliminary fraud detection based on common patterns and should **not** be considered as definitive financial advice. Always:

- Verify information through official regulatory websites
- Consult certified financial advisors
- Report suspicious activities to authorities
- Exercise due diligence before investing

## 🏆 Acknowledgments

- SEBI for providing public access to advisor registration data
- NSE/BSE for market data accessibility

---

**Made with ❤️ for safer investing in India**
