# Financial Fraud Checker Setup Instructions

## Prerequisites
- Docker and Docker Compose
- Chrome or Edge browser

## Installation Steps

1. **Start the services**
```bash
cd path/to/folder
docker compose up -d
```

2. **Initialize the database** _(Only the first time of setup)_
```bash
# Generate Prisma client
docker compose exec web npx prisma generate

# Import SEBI registry data
docker compose exec web npx prisma migrate dev

#Populate Database
docker compose exec postgres psql -U postgres -d advisor_db

#in psql terminal
\i /data/insert_data.sql
\q
```

3. **Test the system**
- Visit http://localhost:3000 for the web UI


## Stopping the services
```bash
docker compose stop
```

