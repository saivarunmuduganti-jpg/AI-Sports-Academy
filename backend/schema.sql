-- ==========================================
-- AI SPORTS ACADEMY DATABASE
-- ==========================================


-- ==========================================
-- USERS
-- ==========================================

CREATE TABLE IF NOT EXISTS users (

    id SERIAL PRIMARY KEY,

    username VARCHAR(50) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL
        CHECK (role IN ('Admin', 'Coach', 'Player')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


-- ==========================================
-- PLAYERS
-- ==========================================

CREATE TABLE IF NOT EXISTS players (

    id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    age INTEGER,

    gender VARCHAR(20),

    sport VARCHAR(50) NOT NULL,

    phone VARCHAR(20),

    email VARCHAR(100),

    joining_date DATE DEFAULT CURRENT_DATE,

    status VARCHAR(20) DEFAULT 'Active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


-- ==========================================
-- COACHES
-- ==========================================

CREATE TABLE IF NOT EXISTS coaches (

    id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    sport VARCHAR(50) NOT NULL,

    phone VARCHAR(20),

    email VARCHAR(100),

    experience INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


-- ==========================================
-- ATTENDANCE
-- ==========================================

CREATE TABLE IF NOT EXISTS attendance (

    id SERIAL PRIMARY KEY,

    player_id INTEGER NOT NULL,

    attendance_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL
        CHECK (
            status IN
            ('Present', 'Absent', 'Late')
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE

);


-- ==========================================
-- FEES
-- ==========================================

CREATE TABLE IF NOT EXISTS fees (

    id SERIAL PRIMARY KEY,

    player_id INTEGER NOT NULL,

    amount NUMERIC(10,2) NOT NULL,

    paid_amount NUMERIC(10,2) DEFAULT 0,

    due_date DATE,

    status VARCHAR(20) DEFAULT 'Pending'
        CHECK (
            status IN
            ('Paid', 'Pending', 'Overdue')
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE

);


-- ==========================================
-- PERFORMANCE
-- ==========================================

CREATE TABLE IF NOT EXISTS performance (

    id SERIAL PRIMARY KEY,

    player_id INTEGER NOT NULL,

    test_name VARCHAR(100),

    score NUMERIC(5,2),

    test_date DATE DEFAULT CURRENT_DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE

);


-- ==========================================
-- TRAINING SESSIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS training_sessions (

    id SERIAL PRIMARY KEY,

    sport VARCHAR(50) NOT NULL,

    coach_id INTEGER,

    session_date DATE NOT NULL,

    start_time TIME,

    end_time TIME,

    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (coach_id)
        REFERENCES coaches(id)
        ON DELETE SET NULL

);