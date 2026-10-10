# AI Sports Academy - PostgreSQL Version

## 1. Backend files

Put these files inside:
AI-Sports-Academy-Corrected/backend/

- app.py
- database.py
- .env

Use your real PostgreSQL password in `.env`.

## 2. Install packages

With the virtual environment active:

pip install flask flask-cors psycopg2-binary python-dotenv werkzeug

## 3. Run backend

cd backend
python app.py

The API runs at:
http://127.0.0.1:5000

Test:
http://127.0.0.1:5000/api/test-db

## 4. Frontend

Replace the old frontend script.js with the new script.js.

Make sure the HTML still loads Chart.js if the dashboard uses charts.

## 5. Important

The new frontend no longer stores players, coaches, fees or schedules in
sportsAcademyData localStorage. PostgreSQL is the source of truth.

The only localStorage item still used is rememberedUsername.
The logged-in user is stored in sessionStorage.

## 6. Existing player

Your current Rahul player should appear from PostgreSQL:

GET http://127.0.0.1:5000/api/players

Expected fields include:
id, name, age, gender, sport, batch, attendance, performance, status
