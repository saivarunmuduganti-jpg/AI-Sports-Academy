from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_connection
from datetime import date, datetime

app = Flask(__name__)
CORS(app)

# ------------------------------------------------------------------
# Database helpers
# ------------------------------------------------------------------

def query(sql, params=(), fetch="all", commit=False):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        result = None

        if fetch == "one":
            row = cur.fetchone()
            if row:
                cols = [d[0] for d in cur.description]
                result = dict(zip(cols, row))
        elif fetch == "all":
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            result = [dict(zip(cols, row)) for row in rows]

        if commit:
            conn.commit()

        cur.close()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute(sql, params=(), returning=False):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        result = None

        if returning:
            row = cur.fetchone()
            if row:
                cols = [d[0] for d in cur.description]
                result = dict(zip(cols, row))

        conn.commit()
        cur.close()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ensure_extra_columns():
    # These columns are needed by the current frontend.
    statements = [
        "ALTER TABLE players ADD COLUMN IF NOT EXISTS batch VARCHAR(20) DEFAULT 'U-14'",
        "ALTER TABLE players ADD COLUMN IF NOT EXISTS attendance NUMERIC(5,2) DEFAULT 85",
        "ALTER TABLE players ADD COLUMN IF NOT EXISTS performance NUMERIC(5,2) DEFAULT 75",
        "ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS day VARCHAR(20)",
        "ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS batch VARCHAR(20) DEFAULT 'U-14'",
        "ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS venue VARCHAR(100) DEFAULT 'Main Ground'",
    ]

    conn = get_connection()
    try:
        cur = conn.cursor()
        for statement in statements:
            cur.execute(statement)
        conn.commit()
        cur.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def serialize(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def clean_row(row):
    if not row:
        return row
    return {k: serialize(v) for k, v in row.items()}


# ------------------------------------------------------------------
# Basic routes
# ------------------------------------------------------------------

@app.route("/")
def home():
    return jsonify({
        "success": True,
        "message": "AI Sports Academy API is running"
    })


@app.route("/api/test-db")
def test_db():
    try:
        row = query("SELECT version() AS version", fetch="one")
        return jsonify({
            "success": True,
            "database": "PostgreSQL",
            "version": row["version"]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ------------------------------------------------------------------
# Authentication
# ------------------------------------------------------------------

@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    role = str(data.get("role", "Player")).strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required."}), 400

    if len(password) < 4:
        return jsonify({"success": False, "message": "Password must contain at least 4 characters."}), 400

    if role not in ("Admin", "Coach", "Player"):
        return jsonify({"success": False, "message": "Invalid role."}), 400

    try:
        row = execute(
            """
            INSERT INTO users (username, password_hash, role)
            VALUES (%s, %s, %s)
            RETURNING id, username, role
            """,
            (username, generate_password_hash(password), role),
            returning=True
        )
        return jsonify({
            "success": True,
            "message": "Account created successfully",
            "user": row
        }), 201
    except Exception as e:
        if "duplicate key" in str(e).lower() or "unique" in str(e).lower():
            return jsonify({"success": False, "message": "Username already exists."}), 409
        return jsonify({"success": False, "message": str(e)}), 500


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    role = str(data.get("role", "")).strip()

    row = query(
        "SELECT id, username, password_hash, role FROM users WHERE LOWER(username)=LOWER(%s)",
        (username,),
        fetch="one"
    )

    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"success": False, "message": "Invalid username or password."}), 401

    if row["role"] != role:
        return jsonify({"success": False, "message": "Selected role does not match your account."}), 403

    return jsonify({
        "success": True,
        "user": {
            "id": row["id"],
            "username": row["username"],
            "role": row["role"]
        }
    })


# ------------------------------------------------------------------
# Players
# ------------------------------------------------------------------

@app.get("/api/players")
def get_players():
    try:
        rows = query("""
            SELECT id, name, age, gender, sport, phone, email,
                   joining_date, status,
                   COALESCE(batch, 'U-14') AS batch,
                   COALESCE(attendance, 85) AS attendance,
                   COALESCE(performance, 75) AS performance
            FROM players
            ORDER BY id
        """)
        return jsonify([clean_row(r) for r in rows])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/players")
def add_player():
    data = request.get_json(silent=True) or {}
    required = ["name", "age", "sport"]

    if any(data.get(k) in (None, "") for k in required):
        return jsonify({"success": False, "message": "Name, age and sport are required."}), 400

    try:
        row = execute("""
            INSERT INTO players
                (name, age, gender, sport, phone, email, batch, attendance, performance, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
        """, (
            data["name"].strip(),
            int(data["age"]),
            data.get("gender", "Not specified"),
            data["sport"],
            data.get("phone", ""),
            data.get("email", ""),
            data.get("batch", "U-14"),
            float(data.get("attendance", 85)),
            float(data.get("performance", 75)),
            data.get("status", "Active")
        ), returning=True)

        return jsonify({
            "success": True,
            "id": row["id"],
            "message": "Player added successfully"
        }), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.put("/api/players/<int:player_id>")
def update_player(player_id):
    data = request.get_json(silent=True) or {}

    try:
        row = execute("""
            UPDATE players
            SET name=%s,
                age=%s,
                sport=%s,
                batch=%s
            WHERE id=%s
            RETURNING id
        """, (
            data.get("name"),
            int(data.get("age")),
            data.get("sport"),
            data.get("batch", "U-14"),
            player_id
        ), returning=True)

        if not row:
            return jsonify({"success": False, "message": "Player not found."}), 404

        return jsonify({"success": True, "message": "Player updated successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.delete("/api/players/<int:player_id>")
def delete_player(player_id):
    try:
        row = execute(
            "DELETE FROM players WHERE id=%s RETURNING id",
            (player_id,),
            returning=True
        )
        if not row:
            return jsonify({"success": False, "message": "Player not found."}), 404

        return jsonify({"success": True, "message": "Player deleted successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ------------------------------------------------------------------
# Coaches
# ------------------------------------------------------------------

@app.get("/api/coaches")
def get_coaches():
    try:
        rows = query("""
            SELECT id, name, sport, phone, email,
                   COALESCE(experience, 0) AS experience
            FROM coaches
            ORDER BY id
        """)

        result = []
        for r in rows:
            row = clean_row(r)
            row["batch"] = "U-14"
            result.append(row)

        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/coaches")
def add_coach():
    data = request.get_json(silent=True) or {}

    if not data.get("name") or not data.get("sport"):
        return jsonify({"success": False, "message": "Name and sport are required."}), 400

    try:
        row = execute("""
            INSERT INTO coaches (name, sport, phone, email, experience)
            VALUES (%s,%s,%s,%s,%s)
            RETURNING id
        """, (
            data["name"].strip(),
            data["sport"],
            data.get("phone", ""),
            data.get("email", ""),
            int(data.get("experience", 0))
        ), returning=True)

        return jsonify({
            "success": True,
            "id": row["id"],
            "message": "Coach added successfully"
        }), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.delete("/api/coaches/<int:coach_id>")
def delete_coach(coach_id):
    try:
        row = execute(
            "DELETE FROM coaches WHERE id=%s RETURNING id",
            (coach_id,),
            returning=True
        )
        if not row:
            return jsonify({"success": False, "message": "Coach not found."}), 404

        return jsonify({"success": True, "message": "Coach deleted successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ------------------------------------------------------------------
# Attendance
# ------------------------------------------------------------------

@app.get("/api/attendance")
def get_attendance():
    try:
        rows = query("""
            SELECT a.id, a.player_id, p.name, p.sport,
                   COALESCE(p.batch, 'U-14') AS batch,
                   a.attendance_date, a.status
            FROM attendance a
            JOIN players p ON p.id = a.player_id
            ORDER BY a.attendance_date DESC, p.name
        """)
        return jsonify([clean_row(r) for r in rows])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/attendance")
def save_attendance():
    data = request.get_json(silent=True) or {}
    player_id = data.get("player_id")
    attendance_date = data.get("attendance_date") or date.today().isoformat()
    status = data.get("status")

    if not player_id or status not in ("Present", "Absent", "Late"):
        return jsonify({"success": False, "message": "Invalid attendance data."}), 400

    try:
        existing = query("""
            SELECT id FROM attendance
            WHERE player_id=%s AND attendance_date=%s
        """, (player_id, attendance_date), fetch="one")

        if existing:
            execute(
                "UPDATE attendance SET status=%s WHERE id=%s",
                (status, existing["id"])
            )
        else:
            execute("""
                INSERT INTO attendance (player_id, attendance_date, status)
                VALUES (%s,%s,%s)
            """, (player_id, attendance_date, status))

        # Recalculate player attendance percentage.
        stats = query("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status='Present') AS present
            FROM attendance
            WHERE player_id=%s
        """, (player_id,), fetch="one")

        total = int(stats["total"] or 0)
        present = int(stats["present"] or 0)
        percentage = round((present / total) * 100, 2) if total else 85

        execute(
            "UPDATE players SET attendance=%s WHERE id=%s",
            (percentage, player_id)
        )

        return jsonify({
            "success": True,
            "message": "Attendance saved successfully",
            "attendance": percentage
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ------------------------------------------------------------------
# Fees
# ------------------------------------------------------------------

@app.get("/api/fees")
def get_fees():
    try:
        rows = query("""
            SELECT f.id, f.player_id, p.name AS player, p.sport,
                   f.amount, f.paid_amount,
                   f.due_date AS due, f.status
            FROM fees f
            JOIN players p ON p.id=f.player_id
            ORDER BY f.id
        """)
        return jsonify([clean_row(r) for r in rows])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/fees")
def add_fee():
    data = request.get_json(silent=True) or {}

    try:
        player_id = int(data["player_id"])
        amount = float(data["amount"])
        paid_amount = float(data.get("paid_amount", 0))
        due = data["due_date"]
        status = data.get("status", "Pending")

        if amount <= 0:
            raise ValueError("Amount must be greater than zero.")

        row = execute("""
            INSERT INTO fees (player_id, amount, paid_amount, due_date, status)
            VALUES (%s,%s,%s,%s,%s)
            RETURNING id
        """, (player_id, amount, paid_amount, due, status), returning=True)

        return jsonify({
            "success": True,
            "id": row["id"],
            "message": "Fee added successfully"
        }), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.put("/api/fees/<int:fee_id>/paid")
def mark_fee_paid(fee_id):
    try:
        row = execute("""
            UPDATE fees
            SET paid_amount=amount, status='Paid'
            WHERE id=%s
            RETURNING id
        """, (fee_id,), returning=True)

        if not row:
            return jsonify({"success": False, "message": "Fee record not found."}), 404

        return jsonify({"success": True, "message": "Fee marked as paid"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ------------------------------------------------------------------
# Performance
# ------------------------------------------------------------------

@app.get("/api/performance")
def get_performance():
    try:
        rows = query("""
            SELECT id, player_id, test_name, score, test_date
            FROM performance
            ORDER BY test_date DESC, id DESC
        """)
        return jsonify([clean_row(r) for r in rows])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/performance")
def add_performance():
    data = request.get_json(silent=True) or {}

    try:
        player_id = int(data["player_id"])
        score = float(data["score"])
        test_name = data.get("test_name", "Performance Test")
        test_date = data.get("test_date") or date.today().isoformat()

        row = execute("""
            INSERT INTO performance (player_id, test_name, score, test_date)
            VALUES (%s,%s,%s,%s)
            RETURNING id
        """, (player_id, test_name, score, test_date), returning=True)

        # Keep player performance synchronized with latest test.
        execute(
            "UPDATE players SET performance=%s WHERE id=%s",
            (score, player_id)
        )

        return jsonify({
            "success": True,
            "id": row["id"],
            "message": "Performance saved successfully"
        }), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ------------------------------------------------------------------
# Training / schedule
# ------------------------------------------------------------------

@app.get("/api/training")
def get_training():
    try:
        rows = query("""
            SELECT t.id, t.sport,
                   COALESCE(t.day, TO_CHAR(t.session_date, 'Day')) AS day,
                   COALESCE(t.batch, 'U-14') AS batch,
                   COALESCE(
                       TO_CHAR(t.start_time, 'HH12:MI AM') || ' - ' ||
                       TO_CHAR(t.end_time, 'HH12:MI AM'),
                       ''
                   ) AS time,
                   COALESCE(c.name, 'Unassigned') AS coach,
                   COALESCE(t.venue, 'Main Ground') AS venue,
                   t.session_date,
                   t.description
            FROM training_sessions t
            LEFT JOIN coaches c ON c.id=t.coach_id
            ORDER BY t.session_date, t.id
        """)
        return jsonify([clean_row(r) for r in rows])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/training")
def add_training():
    data = request.get_json(silent=True) or {}

    try:
        sport = data["sport"]
        day = data.get("day", "Monday")
        batch = data.get("batch", "U-14")
        time_text = data.get("time", "")
        venue = data.get("venue", "Main Ground")
        coach_id = data.get("coach_id")
        session_date = data.get("session_date") or date.today().isoformat()

        start_time = None
        end_time = None

        # Accept "5:00 PM - 7:00 PM" or similar.
        if " - " in time_text:
            start_text, end_text = [x.strip() for x in time_text.split(" - ", 1)]
            for fmt in ("%I:%M %p", "%H:%M"):
                try:
                    start_time = datetime.strptime(start_text, fmt).time()
                    break
                except ValueError:
                    pass
            for fmt in ("%I:%M %p", "%H:%M"):
                try:
                    end_time = datetime.strptime(end_text, fmt).time()
                    break
                except ValueError:
                    pass

        if coach_id:
            coach_id = int(coach_id)
        else:
            coach = query(
                "SELECT id FROM coaches WHERE sport=%s ORDER BY id LIMIT 1",
                (sport,),
                fetch="one"
            )
            coach_id = coach["id"] if coach else None

        row = execute("""
            INSERT INTO training_sessions
                (sport, coach_id, session_date, start_time, end_time,
                 description, day, batch, venue)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
        """, (
            sport, coach_id, session_date, start_time, end_time,
            data.get("description", ""), day, batch, venue
        ), returning=True)

        return jsonify({
            "success": True,
            "id": row["id"],
            "message": "Training session added successfully"
        }), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.delete("/api/training/<int:training_id>")
def delete_training(training_id):
    try:
        row = execute(
            "DELETE FROM training_sessions WHERE id=%s RETURNING id",
            (training_id,),
            returning=True
        )
        if not row:
            return jsonify({"success": False, "message": "Training session not found."}), 404

        return jsonify({"success": True, "message": "Training session deleted"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ------------------------------------------------------------------
# Dashboard
# ------------------------------------------------------------------

@app.get("/api/dashboard")
def dashboard():
    try:
        players_count = query(
            "SELECT COUNT(*) AS count FROM players",
            fetch="one"
        )["count"]

        coaches_count = query(
            "SELECT COUNT(*) AS count FROM coaches",
            fetch="one"
        )["count"]

        player_metrics = query("""
            SELECT
                COALESCE(ROUND(AVG(attendance)), 0) AS attendance,
                COALESCE(ROUND(AVG(performance)), 0) AS performance
            FROM players
        """, fetch="one")

        fees = query("""
            SELECT
                COALESCE(SUM(amount),0) AS total,
                COALESCE(SUM(paid_amount),0) AS paid,
                COALESCE(SUM(amount - paid_amount),0) AS pending
            FROM fees
            WHERE status <> 'Paid' OR paid_amount < amount
        """, fetch="one")

        return jsonify({
            "success": True,
            "players": int(players_count),
            "coaches": int(coaches_count),
            "attendance": float(player_metrics["attendance"] or 0),
            "performance": float(player_metrics["performance"] or 0),
            "fees": float(fees["pending"] or 0),
            "total_fees": float(fees["total"] or 0),
            "paid_fees": float(fees["paid"] or 0)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.get("/api/reports")
def reports():
    return dashboard()


# ------------------------------------------------------------------
# Startup
# ------------------------------------------------------------------

if __name__ == "__main__":
    ensure_extra_columns()
    app.run(debug=True, port=5000)
