# Financial Fraud Checker Setup Instructions

## Prerequisites
- Docker and Docker Compose
- Chrome or Edge browser

## Installation Steps

1. **Start the services**
```bash
cd d:\.ramG\Projects\SEBI
docker compose up -d
```

2. **Train the ML model**
```bash
docker compose exec ml python train.py
```

3. **Initialize the database**
```bash
# Generate Prisma client
docker compose exec web npx prisma generate

# Run database migrations
docker compose exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/advisor_db web npx prisma migrate dev --name init

# Import SEBI registry data
docker compose exec web npm run seed:sebi
```

4. **Install the browser extension**
- Open Chrome/Edge and go to `chrome://extensions` or `edge://extensions`
- Enable "Developer mode"
- Click "Load unpacked" and select the `extension` folder
- Pin the extension to your toolbar

5. **Test the system**
- Visit http://localhost:3000 for the web UI
- Click the extension icon to open the popup
- Select text on any webpage and use the context menu option

## Usage
- Select suspicious text on any webpage
- Right-click and choose "Check selected text for fraud..."
- Click the extension icon to analyze the text
- View risk score, explanations, and SEBI registry verification

## Stopping the services
```bash
docker compose down
```
