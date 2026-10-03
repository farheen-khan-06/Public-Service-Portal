import mysql.connector
import flask
import os
import time
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask import send_from_directory

app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = 'uploads'
PORTFOLIO_FOLDER = os.path.join(
    UPLOAD_FOLDER,
    'portfolio'
)

os.makedirs(PORTFOLIO_FOLDER, exist_ok=True)

def get_db_connection():
    return mysql.connector.connect( 
        host="localhost",
        user="root",
        password="khan2007@02",
        database="public_service_portal"
    )

@app.route("/test-db")
def test_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT DATABASE();")
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        return f"Database connected successfully: {result[0]}"

    except Exception as e:
        return f"Database connection failed: {e}"

@app.route("/")
def home():
    return "Multilingual Public Service Portal Backend is Running!"

# citizen - sign up
@app.route('/api/citizen/signup', methods=['POST'])
def citizen_signup():
    data = request.get_json()

    full_name = data.get('full_name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    profile_photo = data.get('profile_photo')
    location = data.get('location')
    preferred_language = data.get('preferred_language')

    # Check required fields
    if not full_name or not email or not password:
        return jsonify({
            "success": False,
            "message": "Full name, email and password are required"
        }), 400

    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="khan2007@02",
            database="public_service_portal"
        )

        cursor = conn.cursor()

        # Check whether email already exists
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 409

        # Hash password before storing it
        hashed_password = generate_password_hash(password)

        # Insert citizen
        cursor.execute("""
            INSERT INTO users
            (full_name, email, password, role, phone,
             profile_photo, location, preferred_language)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            full_name,
            email,
            hashed_password,
            "citizen",
            phone,
            profile_photo,
            location,
            preferred_language
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Citizen account created successfully"
        }), 201

    except mysql.connector.Error as err:
        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500

# worker - sign up
@app.route('/api/worker/signup', methods=['POST'])
def worker_signup():

    data = request.form

    full_name = data.get('full_name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    profile_photo = data.get('profile_photo')
    location = data.get('location')

    area = data.get('area')
    primary_skill = data.get('primary_skill')
    other_skills = data.get('other_skills')
    experience_years = data.get('experience_years')
    languages = data.get('languages')
    services_offered = data.get('services_offered')
    about = data.get('about')
    availability = data.get('availability')
    charges = data.get('charges')
    certifications = data.get('certifications')
    previous_work_experience = data.get('previous_work_experience')

    # Get uploaded portfolio images
    portfolio_files = request.files.getlist('portfolio')


    # Check required fields
    if not full_name or not email or not password or not primary_skill:

        return jsonify({
            "success": False,
            "message": "Name, email, password and primary skill are required"
        }), 400


    try:

        conn = get_db_connection()
        cursor = conn.cursor()


        # Find category ID
        cursor.execute(
            "SELECT id FROM job_categories WHERE category_name = %s",
            (primary_skill,)
        )

        category = cursor.fetchone()

        if not category:

            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Invalid job category"
            }), 400


        category_id = category[0]


        # Check whether email already exists
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:

            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 409


        # Hash password
        hashed_password = generate_password_hash(password)


        # Insert account into users table
        cursor.execute("""
            INSERT INTO users
            (full_name, email, password, role, phone,
             profile_photo, location)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            full_name,
            email,
            hashed_password,
            "worker",
            phone,
            profile_photo,
            location
        ))


        # Get newly created user ID
        user_id = cursor.lastrowid


        # Insert worker-specific information
        cursor.execute("""
            INSERT INTO workers
            (user_id, category_id, primary_skill, other_skills, location,
             area, experience_years, languages, availability,
             charges, about, services_offered,
             certifications, previous_work_experience, portfolio)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s)
        """, (
            user_id,
            category_id,
            primary_skill,
            other_skills,
            location,
            area,
            experience_years or 0,
            languages,
            availability,
            charges,
            about,
            services_offered,
            certifications,
            previous_work_experience,
            None
        ))


        # Get worker ID
        worker_id = cursor.lastrowid


        # Save portfolio images
        saved_portfolio = []

        if portfolio_files:

            worker_folder = os.path.join(
                PORTFOLIO_FOLDER,
                str(worker_id)
            )

            os.makedirs(
                worker_folder,
                exist_ok=True
            )


            allowed_extensions = {
                'jpg',
                'jpeg',
                'png',
                'webp'
            }


            for file in portfolio_files:

                if not file or file.filename == '':
                    continue


                filename = secure_filename(
                    file.filename
                )


                extension = filename.rsplit(
                    '.',
                    1
                )[-1].lower()


                if extension not in allowed_extensions:
                    continue


                unique_filename = (
                    str(int(time.time() * 1000))
                    + '_'
                    + filename
                )


                file_path = os.path.join(
                    worker_folder,
                    unique_filename
                )


                file.save(file_path)


                database_path = (
                    'uploads/portfolio/'
                    + str(worker_id)
                    + '/'
                    + unique_filename
                )


                saved_portfolio.append(
                    database_path
                )


        # Store image paths in MySQL
        portfolio_value = '|'.join(
            saved_portfolio
        )


        cursor.execute("""
            UPDATE workers
            SET portfolio = %s
            WHERE id = %s
        """, (
            portfolio_value,
            worker_id
        ))


        conn.commit()


        cursor.close()
        conn.close()


        return jsonify({
            "success": True,
            "message": "Worker account created successfully",
            "user_id": user_id
        }), 201


    except mysql.connector.Error as err:

        if 'conn' in locals():
            conn.rollback()

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()


        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
    
# login - citizen and worker
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()

    email_or_mobile = data.get('email_or_mobile')
    password = data.get('password')

    if not email_or_mobile or not password:
        return jsonify({
            "success": False,
            "message": "Email/mobile number and password are required"
        }), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Find user using email OR mobile number
        cursor.execute("""
            SELECT id, full_name, email, password, role, phone,
                   profile_photo, location, preferred_language, status
            FROM users
            WHERE email = %s OR phone = %s
        """, (email_or_mobile, email_or_mobile))

        user = cursor.fetchone()

        if not user:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Invalid email/mobile number or password"
            }), 401

        # Check password
        if not check_password_hash(user['password'], password):
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Invalid email/mobile number or password"
            }), 401

        # Check if account is blocked
        if user['status'] == 'blocked':
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Your account has been blocked by the administrator."
            }), 403

        # Basic user information
        user_data = {
            "id": user['id'],
            "name": user['full_name'],
            "email": user['email'],
            "role": user['role'],
            "phone": user['phone'],
            "profile_photo": user['profile_photo'],
            "location": user['location'],
            "preferred_language": user['preferred_language']
        }

        # If user is a worker, get worker-specific information
        if user['role'] == 'worker':

            cursor.execute("""
                SELECT
                    primary_skill,
                    other_skills,
                    location,
                    area,
                    experience_years,
                    languages,
                    services_offered,
                    about,
                    availability,
                    charges,
                    certifications,
                    previous_work_experience
                FROM workers
                WHERE user_id = %s
            """, (user['id'],))

            worker = cursor.fetchone()

            if worker:
                user_data["area"] = worker["area"]
                user_data["skill"] = worker["primary_skill"]
                user_data["skills"] = worker["other_skills"]
                user_data["experience"] = worker["experience_years"]
                user_data["languages"] = worker["languages"]
                user_data["services"] = worker["services_offered"]
                user_data["about"] = worker["about"]
                user_data["availability"] = worker["availability"]
                user_data["charges"] = worker["charges"]
                user_data["certifications"] = worker["certifications"]
                user_data["history"] = worker["previous_work_experience"]

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": user_data
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
    
# forget - password
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()

    email = data.get('email')
    new_password = data.get('new_password')

    if not email or not new_password:
        return jsonify({
            "success": False,
            "message": "Email and new password are required"
        }), 400

    if len(new_password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must be at least 6 characters"
        }), 400

    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="khan2007@02",
            database="public_service_portal"
        )

        cursor = conn.cursor(dictionary=True)

        # Check whether email exists
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )

        user = cursor.fetchone()

        if not user:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "No account found with this email"
            }), 404

        # Hash the new password
        hashed_password = generate_password_hash(new_password)

        # Update password
        cursor.execute(
            "UPDATE users SET password = %s WHERE id = %s",
            (hashed_password, user['id'])
        )

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Password reset successfully"
        }), 200

    except mysql.connector.Error as err:
        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500

# Get all workers
@app.route('/api/workers', methods=['GET'])
def get_workers():

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                w.id,
                w.user_id,
                u.full_name AS name,
                u.email,
                u.phone,
                u.profile_photo,
                w.primary_skill AS skill,
                w.other_skills AS skills,
                w.location,
                w.area,
                w.experience_years AS experience,
                w.languages,
                w.availability,
                w.charges,
                w.about,
                w.services_offered AS services,
                w.certifications,
                w.previous_work_experience AS history,
                w.portfolio,
                w.rating,
                w.review_count AS reviews,
                w.verified,
                w.verification_status,
                w.is_demo
            FROM workers w
            JOIN users u ON w.user_id = u.id
            WHERE u.role = 'worker'
            AND w.verification_status = 'approved'
        """)

        workers = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "workers": workers
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500

# ============================================================
# JOB ASSISTANT - JOB CATEGORIES
# ============================================================

@app.route('/api/job-categories', methods=['GET'])
def get_job_categories():

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                category_name
            FROM job_categories
            ORDER BY id ASC
        """)

        categories = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "categories": categories
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# ============================================================
# JOB ASSISTANT - CAREER ROADMAP
# ============================================================

@app.route('/api/career-roadmap/<int:category_id>', methods=['GET'])
def get_career_roadmap(category_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                category_id,
                stage_number,
                stage_title,
                description
            FROM career_roadmaps
            WHERE category_id = %s
            ORDER BY stage_number ASC
        """, (category_id,))

        roadmap = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "roadmap": roadmap
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500

# ============================================================
# JOB ASSISTANT - CERTIFICATIONS
# ============================================================

@app.route('/api/certifications/<int:category_id>', methods=['GET'])
def get_certifications(category_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                category_id,
                certification_name,
                issuing_authority,
                certification_type,
                description,
                eligibility,
                duration,
                official_link
            FROM certifications
            WHERE category_id = %s
        """, (category_id,))

        certifications = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "certifications": certifications
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500

# ============================================================
# JOB ASSISTANT - GOVERNMENT SCHEMES
# ============================================================

@app.route('/api/government-schemes/<int:category_id>', methods=['GET'])
def get_government_schemes(category_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                gs.id,
                gs.scheme_name,
                gs.ministry,
                gs.scheme_type,
                gs.description,
                gs.eligibility,
                gs.benefits,
                gs.application_method,
                gs.official_link,
                gs.status,
                gs.last_verified,
                csm.recommendation_reason,
                csm.priority
            FROM category_scheme_mapping csm
            JOIN government_schemes gs
                ON csm.scheme_id = gs.id
            WHERE csm.category_id = %s
            ORDER BY csm.priority ASC
        """, (category_id,))

        schemes = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "schemes": schemes
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500

# ============================================================
# JOB ASSISTANT - SKILL DEVELOPMENT
# ============================================================

@app.route('/api/skill-development/<int:category_id>', methods=['GET'])
def get_skill_development(category_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                category_id,
                skill_name,
                skill_level,
                description,
                why_important,
                learning_path,
                youtube_link
            FROM skill_development
            WHERE category_id = %s
            ORDER BY
                CASE skill_level
                    WHEN 'Beginner' THEN 1
                    WHEN 'Intermediate' THEN 2
                    WHEN 'Advanced' THEN 3
                    ELSE 4
                END
        """, (category_id,))

        skills = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "skills": skills
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# saved - workers
@app.route('/api/saved-workers', methods=['POST'])
def save_worker():

    try:
        data = request.get_json()

        user_id = data.get('user_id')
        worker_id = data.get('worker_id')

        if not user_id or not worker_id:
            return jsonify({
                "success": False,
                "message": "User ID and Worker ID are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check whether already saved
        cursor.execute("""
            SELECT id
            FROM saved_workers
            WHERE user_id = %s AND worker_id = %s
        """, (user_id, worker_id))

        existing = cursor.fetchone()

        if existing:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Worker already saved"
            }), 400

        cursor.execute("""
            INSERT INTO saved_workers (user_id, worker_id)
            VALUES (%s, %s)
        """, (user_id, worker_id))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Worker saved successfully"
        }), 201

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# unsaved - worker
@app.route('/api/saved-workers/<int:worker_id>', methods=['DELETE'])
def remove_saved_worker(worker_id):

    try:
        data = request.get_json()

        user_id = data.get('user_id')

        if not user_id:
            return jsonify({
                "success": False,
                "message": "User ID is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM saved_workers
            WHERE user_id = %s AND worker_id = %s
        """, (user_id, worker_id))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Worker removed from saved workers"
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# get - saved worker
@app.route('/api/saved-workers/<int:user_id>', methods=['GET'])
def get_saved_workers(user_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                w.id,
                w.user_id,
                u.full_name AS name,
                u.email,
                u.phone,
                u.profile_photo,
                w.primary_skill AS skill,
                w.other_skills AS skills,
                w.location,
                w.area,
                w.experience_years AS experience,
                w.languages,
                w.availability,
                w.charges,
                w.about,
                w.services_offered AS services,
                w.certifications,
                w.previous_work_experience AS history,
                w.portfolio,
                w.rating,
                w.review_count AS reviews,
                w.verified,
                w.verification_status,
                sw.saved_at
            FROM saved_workers sw
            JOIN workers w ON sw.worker_id = w.id
            JOIN users u ON w.user_id = u.id
            WHERE sw.user_id = %s
            ORDER BY sw.saved_at DESC
        """, (user_id,))

        workers = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "workers": workers
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close() 

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Citizen - Create Service Request
@app.route('/api/service-requests', methods=['POST'])
def create_service_request():

    try:
        data = request.get_json()

        citizen_id = data.get('citizen_id')
        worker_id = data.get('worker_id')
        request_date = data.get('request_date')
        request_time = data.get('request_time')
        location = data.get('location')
        description = data.get('description')

        # Basic validation
        if not citizen_id or not worker_id:
            return jsonify({
                "success": False,
                "message": "Citizen and worker are required"
            }), 400

        if not request_date or not request_time or not location:
            return jsonify({
                "success": False,
                "message": "Date, time and location are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get worker's primary skill
        cursor.execute("""
            SELECT primary_skill
            FROM workers
            WHERE id = %s
        """, (worker_id,))

        worker = cursor.fetchone()

        if not worker:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Worker not found"
            }), 404

        service_type = worker['primary_skill']

        # Insert service request
        cursor.execute("""
            INSERT INTO service_requests
            (
                citizen_id,
                worker_id,
                service_type,
                request_date,
                request_time,
                location,
                description,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending')
        """, (
            citizen_id,
            worker_id,
            service_type,
            request_date,
            request_time,
            location,
            description
        ))

        conn.commit()

        request_id = cursor.lastrowid

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Service request sent successfully",
            "request_id": request_id
        }), 201

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Get service requests for a citizen (displaying for citizen)
@app.route('/api/service-requests/citizen/<int:citizen_id>', methods=['GET'])
def get_citizen_service_requests(citizen_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                sr.id,
                sr.citizen_id,
                sr.worker_id,
                sr.service_type,
                sr.request_date,
                sr.request_time,
                sr.location,
                sr.description,
                sr.status,
                sr.created_at,
                u.full_name AS worker_name,
                w.location AS worker_location
            FROM service_requests sr
            JOIN workers w
                ON sr.worker_id = w.id
            JOIN users u
                ON w.user_id = u.id
            WHERE sr.citizen_id = %s
            ORDER BY sr.created_at DESC
        """, (citizen_id,))

        requests = cursor.fetchall()

        # Convert MySQL values into JSON-safe values
        for r in requests:

            if r.get('request_date'):
                r['request_date'] = str(r['request_date'])

            if r.get('request_time'):
                r['request_time'] = str(r['request_time'])

            if r.get('created_at'):
                r['created_at'] = str(r['created_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "requests": requests
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500

    except Exception as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        print("Service request error:", err)

        return jsonify({
            "success": False,
            "message": "Server error",
            "error": str(err)
        }), 500
# Citizen - Cancel Service Request
@app.route('/api/service-requests/<int:request_id>/cancel', methods=['PUT'])
def cancel_service_request(request_id):

    try:
        data = request.get_json() or {}

        citizen_id = data.get('citizen_id')

        if not citizen_id:
            return jsonify({
                "success": False,
                "message": "Citizen ID is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE service_requests
            SET status = 'Cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
              AND citizen_id = %s
              AND status IN ('Pending', 'Accepted')
        """, (request_id, citizen_id))

        conn.commit()

        if cursor.rowcount == 0:

            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Request cannot be cancelled"
            }), 400

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Service request cancelled successfully"
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500

    except Exception as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Server error",
            "error": str(err)
        }), 500
# Get service requests for a worker
@app.route('/api/service-requests/worker/<int:user_id>', methods=['GET'])
def get_worker_service_requests(user_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                sr.id,
                sr.citizen_id,
                sr.worker_id,
                sr.service_type,
                sr.request_date,
                sr.request_time,
                sr.location,
                sr.description,
                sr.status,
                sr.created_at,
                u.full_name AS citizen_name,
                u.email AS citizen_email,
                u.phone AS citizen_phone
            FROM service_requests sr
            JOIN workers w
                ON sr.worker_id = w.id
            JOIN users u
                ON sr.citizen_id = u.id 
            WHERE w.user_id = %s
            ORDER BY sr.created_at DESC
        """, (user_id,))

        requests = cursor.fetchall()

        # Convert MySQL date/time objects into strings
        for r in requests:

            if r.get('request_date'):
                r['request_date'] = str(r['request_date'])

            if r.get('request_time'):
                r['request_time'] = str(r['request_time'])

            if r.get('created_at'):
                r['created_at'] = str(r['created_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "requests": requests
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Update service request status
@app.route('/api/service-requests/<int:request_id>/status', methods=['PUT'])
def update_service_request_status(request_id):

    try:
        data = request.get_json()

        status = data.get('status')
        worker_id = data.get('worker_id')

        allowed_statuses = [
            'Accepted',
            'Rejected',
            'Scheduled',
            'Completed',
            'Cancelled'
        ]

        if status not in allowed_statuses:
            return jsonify({
                "success": False,
                "message": "Invalid status"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Make sure this request belongs to this worker
        cursor.execute("""
            SELECT id
            FROM service_requests
            WHERE id = %s AND worker_id = %s
        """, (request_id, worker_id))

        request_row = cursor.fetchone()

        if not request_row:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Request not found or does not belong to this worker"
            }), 404

        cursor.execute("""
            UPDATE service_requests
            SET status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (status, request_id))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Request status updated successfully",
            "status": status
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# review
@app.route('/api/reviews', methods=['POST'])
def submit_review():

    try:
        data = request.get_json()

        worker_id = data.get('worker_id')
        user_id = data.get('user_id')
        rating = data.get('rating')
        review_text = data.get('review_text', '').strip()

        # Check required fields
        if not worker_id or not user_id or not rating:
            return jsonify({
                'success': False,
                'message': 'Worker, user and rating are required'
            }), 400

        # Validate rating
        rating = int(rating)

        if rating < 1 or rating > 5:
            return jsonify({
                'success': False,
                'message': 'Rating must be between 1 and 5'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Insert review
        cursor.execute("""
            INSERT INTO reviews
            (worker_id, user_id, rating, review_text)
            VALUES (%s, %s, %s, %s)
        """, (
            worker_id,
            user_id,
            rating,
            review_text
        ))

        # Calculate new rating and review count
        cursor.execute("""
            SELECT
                AVG(rating) AS average_rating,
                COUNT(*) AS review_count
            FROM reviews
            WHERE worker_id = %s
        """, (worker_id,))

        review_stats = cursor.fetchone()

        new_rating = round(float(review_stats['average_rating'] or 0), 1)
        new_review_count = int(review_stats['review_count'] or 0)

        # Update worker's rating information
        cursor.execute("""
            UPDATE workers
            SET rating = %s,
                review_count = %s
            WHERE id = %s
        """, (
            new_rating,
            new_review_count,
            worker_id
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Review submitted successfully',
            'rating': new_rating,
            'review_count': new_review_count
        })

    except Exception as e:

        print('Submit review error:', e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            'success': False,
            'message': 'Database error while submitting review'
        }), 500
# Get worker reviews
@app.route('/api/reviews/<int:worker_id>', methods=['GET'])
def get_worker_reviews(worker_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                r.id,
                r.rating,
                r.review_text,
                r.created_at,
                u.full_name AS citizen_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.worker_id = %s
            ORDER BY r.created_at DESC
        """, (worker_id,))

        reviews = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "reviews": reviews
        }), 200

    except Exception as e:

        print("Get worker reviews error:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# Get reviews written by a citizen
@app.route('/api/reviews/citizen/<int:user_id>', methods=['GET'])
def get_citizen_reviews(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                r.id,
                r.worker_id,
                r.rating,
                r.review_text,
                r.created_at,
                u.full_name AS worker_name
            FROM reviews r
            JOIN workers w ON r.worker_id = w.id
            JOIN users u ON w.user_id = u.id
            WHERE r.user_id = %s
            ORDER BY r.created_at DESC
        """, (user_id,))

        reviews = cursor.fetchall()

        for r in reviews:
            if r.get('created_at'):
                r['created_at'] = str(r['created_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "reviews": reviews
        }), 200

    except Exception as e:
        print("Citizen reviews error:", e)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# WORKER: EMPLOYMENT HISTORY
@app.route('/api/worker/employment-history/<int:user_id>', methods=['GET'])
def get_employment_history(user_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, user_id, previous_work_experience
            FROM workers
            WHERE user_id = %s
        """, (user_id,))

        worker = cursor.fetchone()

        cursor.close()
        conn.close()

        if not worker:
            return jsonify({
                'success': False,
                'message': 'Worker profile not found'
            }), 404

        return jsonify({
            'success': True,
            'experience': worker.get('previous_work_experience') or ''
        })

    except Exception as e:

        print("Employment history error:", e)

        return jsonify({
            'success': False,
            'message': 'Database error'
        }), 500
# updating
@app.route('/api/worker/employment-history/<int:user_id>', methods=['PUT'])
def update_employment_history(user_id):

    try:

        data = request.get_json()

        experience = data.get('previous_work_experience', '').strip()

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE workers
            SET previous_work_experience = %s
            WHERE user_id = %s
        """, (experience, user_id))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Employment history updated successfully'
        })

    except Exception as e:

        print("Update employment history error:", e)

        return jsonify({
            'success': False,
            'message': 'Database error'
        }), 500
# WORKER: Upload Portfolio Photos
@app.route('/api/worker/portfolio', methods=['POST'])
def upload_worker_portfolio():

    try:

        user_id = request.form.get('user_id')

        if not user_id:
            return jsonify({
                "success": False,
                "message": "User ID is required"
            }), 400

        files = request.files.getlist('portfolio')

        if not files:
            return jsonify({
                "success": False,
                "message": "No portfolio images selected"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Find worker
        cursor.execute("""
            SELECT id, portfolio
            FROM workers
            WHERE user_id = %s
        """, (user_id,))

        worker = cursor.fetchone()

        if not worker:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Worker profile not found"
            }), 404

        worker_id = worker['id']

        # Worker-specific upload folder
        worker_folder = os.path.join(
            PORTFOLIO_FOLDER,
            str(worker_id)
        )

        os.makedirs(
            worker_folder,
            exist_ok=True
        )

        allowed_extensions = {
            'jpg',
            'jpeg',
            'png',
            'webp'
        }

        saved_files = []

        for file in files:

            if not file or file.filename == '':
                continue

            filename = secure_filename(
                file.filename
            )

            if '.' not in filename:
                continue

            extension = filename.rsplit(
                '.',
                1
            )[-1].lower()

            if extension not in allowed_extensions:
                continue

            unique_filename = (
                str(int(time.time() * 1000))
                + '_'
                + filename
            )

            file_path = os.path.join(
                worker_folder,
                unique_filename
            )

            file.save(file_path)

            database_path = (
                f'uploads/portfolio/'
                f'{worker_id}/'
                f'{unique_filename}'
            )

            saved_files.append(database_path)

        if not saved_files:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "No valid image files were uploaded"
            }), 400

        # Get old portfolio paths
        old_portfolio = worker['portfolio'] or ''

        if old_portfolio:
            updated_portfolio = (
                old_portfolio
                + '|'
                + '|'.join(saved_files)
            )
        else:
            updated_portfolio = '|'.join(
                saved_files
            )

        # Update workers table
        cursor.execute("""
            UPDATE workers
            SET portfolio = %s
            WHERE id = %s
        """, (
            updated_portfolio,
            worker_id
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Work photo uploaded successfully",
            "files": saved_files
        }), 200

    except Exception as e:

        print(
            "Portfolio upload error:",
            e
        )

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Unable to upload portfolio images",
            "error": str(e)
        }), 500
# WORKER: Delete Portfolio Photo
@app.route('/api/worker/portfolio/delete', methods=['DELETE'])
def delete_worker_portfolio_photo():

    try:

        data = request.get_json()

        user_id = data.get('user_id')
        photo_path = data.get('photo_path')

        if not user_id or not photo_path:
            return jsonify({
                "success": False,
                "message": "User ID and photo path are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get worker portfolio
        cursor.execute("""
            SELECT id, portfolio
            FROM workers
            WHERE user_id = %s
        """, (user_id,))

        worker = cursor.fetchone()

        if not worker:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Worker profile not found"
            }), 404

        old_portfolio = worker['portfolio'] or ''

        portfolio_list = [
            p.strip()
            for p in old_portfolio.split('|')
            if p.strip()
        ]

        if photo_path not in portfolio_list:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Photo not found in portfolio"
            }), 404

        # Remove selected photo from the list
        portfolio_list.remove(photo_path)

        updated_portfolio = '|'.join(
            portfolio_list
        )

        # Update MySQL
        cursor.execute("""
            UPDATE workers
            SET portfolio = %s
            WHERE user_id = %s
        """, (
            updated_portfolio,
            user_id
        ))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Portfolio photo deleted successfully"
        }), 200

    except Exception as e:

        print(
            "Delete portfolio photo error:",
            e
        )

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Unable to delete portfolio photo",
            "error": str(e)
        }), 500
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):

    return send_from_directory(
        UPLOAD_FOLDER,
        filename
    )

# WORKER: Update Profile
@app.route('/api/worker/profile/<int:user_id>', methods=['PUT'])
def update_worker_profile(user_id):

    try:

        data = request.get_json()

        full_name = data.get('full_name', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        location = data.get('location', '').strip()

        experience_years = data.get('experience_years', 0)
        charges = data.get('charges', '').strip()
        availability = data.get('availability', '').strip()
        other_skills = data.get('other_skills', '').strip()
        services_offered = data.get('services_offered', '').strip()
        languages = data.get('languages', '').strip()
        about = data.get('about', '').strip()

        if not full_name or not email:
            return jsonify({
                "success": False,
                "message": "Name and email are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Update users table
        cursor.execute("""
            UPDATE users
            SET full_name = %s,
                email = %s,
                phone = %s,
                location = %s
            WHERE id = %s
              AND role = 'worker'
        """, (
            full_name,
            email,
            phone,
            location,
            user_id
        ))

        # Update workers table
        cursor.execute("""
            UPDATE workers
            SET other_skills = %s,
                location = %s,
                experience_years = %s,
                languages = %s,
                availability = %s,
                charges = %s,
                about = %s,
                services_offered = %s
            WHERE user_id = %s
        """, (
            other_skills,
            location,
            experience_years or 0,
            languages,
            availability,
            charges,
            about,
            services_offered,
            user_id
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Worker profile updated successfully"
        }), 200

    except Exception as e:

        print(
            "Worker profile update error:",
            e
        )

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(e)
        }), 500
# WORKER: Get Own Profile
@app.route('/api/worker/profile/<int:user_id>', methods=['GET'])
def get_worker_profile(user_id):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                w.id,
                w.user_id,
                w.primary_skill,
                w.other_skills,
                w.location,
                w.area,
                w.experience_years,
                w.languages,
                w.availability,
                w.charges,
                w.about,
                w.services_offered,
                w.certifications,
                w.previous_work_experience,
                w.portfolio,
                w.rating,
                w.review_count,
                w.verified,
                w.verification_status,
                u.full_name,
                u.email,
                u.phone
            FROM workers w
            JOIN users u ON w.user_id = u.id
            WHERE w.user_id = %s
        """, (user_id,))

        worker = cursor.fetchone()

        cursor.close()
        conn.close()

        if not worker:
            return jsonify({
                "success": False,
                "message": "Worker profile not found"
            }), 404

        return jsonify({
            "success": True,
            "worker": worker
        }), 200

    except Exception as e:

        print("Get worker profile error:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# worker dashboard-verification status
@app.route('/api/worker/verification-status/<int:user_id>', methods=['GET'])
def get_worker_verification_status(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                verification_status,
                verified
            FROM workers
            WHERE user_id = %s
        """, (user_id,))

        worker = cursor.fetchone()

        cursor.close()
        conn.close()

        if not worker:
            return jsonify({
                "success": False,
                "message": "Worker profile not found"
            }), 404

        return jsonify({
            "success": True,
            "verification_status": worker["verification_status"],
            "verified": worker["verified"]
        }), 200

    except Exception as e:
        print("Worker verification status error:", e)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# worker-request verification again
@app.route('/api/worker/request-verification/<int:user_id>', methods=['PUT'])
def request_worker_verification(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT verification_status
            FROM workers
            WHERE user_id = %s
        """, (user_id,))

        worker = cursor.fetchone()

        if not worker:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Worker profile not found"
            }), 404

        if worker["verification_status"] != "rejected":
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Verification request cannot be submitted"
            }), 400

        cursor.execute("""
            UPDATE workers
            SET verification_status = 'pending',
                verified = 0
            WHERE user_id = %s
        """, (user_id,))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Verification request submitted successfully"
        }), 200

    except Exception as e:
        print("Request verification error:", e)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# WORKER: Dashboard 
@app.route('/api/worker/dashboard/<int:user_id>', methods=['GET'])
def get_worker_dashboard(user_id):

    try:

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get worker ID from user ID
        cursor.execute("""
            SELECT id, rating, review_count
            FROM workers
            WHERE user_id = %s
        """, (user_id,))

        worker = cursor.fetchone()

        if not worker:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Worker profile not found"
            }), 404

        worker_id = worker["id"]

        # Count request statuses
        cursor.execute("""
            SELECT
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_requests,
                SUM(CASE WHEN status IN ('Accepted', 'Scheduled') THEN 1 ELSE 0 END) AS active_jobs,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_jobs,
                COUNT(*) AS total_requests
            FROM service_requests
            WHERE worker_id = %s
        """, (worker_id,))

        stats = cursor.fetchone()
        # Get recent work requests
        cursor.execute("""
        SELECT
        sr.id,
        sr.service_type,
        sr.status,
        sr.created_at,
        u.full_name AS citizen_name
        FROM service_requests sr
        JOIN users u ON sr.citizen_id = u.id
        WHERE sr.worker_id = %s
        ORDER BY sr.created_at DESC
        LIMIT 5
        """, (worker_id,))
        recent_requests = cursor.fetchall()
        # Get recent ratings and reviews

        cursor.execute("""
        SELECT
        r.id,
        r.rating,
        r.review_text,
        r.created_at,
        u.full_name AS citizen_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.worker_id = %s
        ORDER BY r.created_at DESC
        LIMIT 5
        """, (worker_id,))
        reviews = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "stats": {
                "pending_requests": stats["pending_requests"] or 0,
                "active_jobs": stats["active_jobs"] or 0,
                "completed_jobs": stats["completed_jobs"] or 0,
                "total_requests": stats["total_requests"] or 0,
                "rating": float(worker["rating"] or 0),
                "review_count": worker["review_count"] or 0
            },
            "recent_requests": recent_requests,
            "reviews": reviews
        }), 200

    except Exception as e:

        print("Worker dashboard error:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(e)
        }), 500
# ============================================================
# WOMEN & RIGHTS - LEGAL RIGHTS
# ============================================================
@app.route('/api/women/legal-rights', methods=['GET'])
def get_women_legal_rights():

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                category_id,
                category_title,
                category_icon,
                category_color,
                category_description,
                right_title,
                right_description,
                key_points,
                law,
                action
            FROM women_legal_rights
            ORDER BY
                CASE category_id
                    WHEN 'domestic' THEN 1
                    WHEN 'workplace' THEN 2
                    WHEN 'marriage' THEN 3
                    WHEN 'property' THEN 4
                    WHEN 'cyber' THEN 5
                    WHEN 'sexual' THEN 6
                    WHEN 'police' THEN 7
                    WHEN 'general' THEN 8
                    ELSE 9
                END,
                id ASC
        """)

        rights = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "rights": rights
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# ============================================================
# WOMEN & RIGHTS - GOVERNMENT SCHEMES
# ============================================================

@app.route('/api/women/government-schemes', methods=['GET'])
def get_women_government_schemes():

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                scheme_name,
                scheme_level,
                status,
                category,
                description,
                eligibility,
                benefits,
                documents,
                application_method,
                official_link,
                eligibility_tags
            FROM women_government_schemes
            WHERE status = 'Active'
            ORDER BY id ASC
        """)

        schemes = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "schemes": schemes
        }), 200

    except mysql.connector.Error as err:

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# ============================================================
# WOMEN & RIGHTS - LEGAL AID & HELPLINES
# ============================================================

@app.route('/api/women/legal-aid', methods=['GET'])
def get_women_legal_aid():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                icon,
                color,
                name,
                purpose,
                who_can_use,
                contact,
                website,
                description
            FROM women_legal_aid_helplines
            ORDER BY id ASC
        """)

        legal_aid = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "legal_aid": legal_aid
        }), 200

    except mysql.connector.Error as err:
        print("LEGAL AID ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# ============================================================
# WOMEN & RIGHTS - AWARENESS ARTICLES
# ============================================================
@app.route('/api/women/awareness-articles', methods=['GET'])
def get_women_awareness_articles():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                title,
                category,
                excerpt,
                content,
                article_date,
                author
            FROM women_awareness_articles
            ORDER BY article_date DESC, id DESC
        """)

        articles = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "articles": articles
        }), 200

    except mysql.connector.Error as err:
        print("AWARENESS ARTICLES ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# ============================================================
# WOMEN & RIGHTS - EVIDENCE CHECKLIST
# ============================================================

@app.route('/api/women/evidence-checklists', methods=['GET'])
def get_women_evidence_checklists():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                situation_id,
                situation_title,
                situation_icon,
                situation_color,
                evidence_item
            FROM women_evidence_checklists
            ORDER BY
                CASE situation_id
                    WHEN 'domestic' THEN 1
                    WHEN 'workplace' THEN 2
                    WHEN 'cyber' THEN 3
                    WHEN 'property' THEN 4
                    WHEN 'dowry' THEN 5
                    WHEN 'other' THEN 6
                    ELSE 7
                END,
                id ASC
        """)

        checklists = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "checklists": checklists
        }), 200

    except mysql.connector.Error as err:
        print("EVIDENCE CHECKLIST ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# WOMEN & RIGHTS - LEGAL DOCUMENT TEMPLATES
@app.route('/api/legal-document-templates', methods=['GET'])
def get_legal_document_templates():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                title,
                icon,
                color,
                template_content,
                submission_place,
                required_documents,
                next_steps,
                checklist_items,
                created_at
            FROM legal_document_templates
            WHERE record_type = 'TEMPLATE'
            ORDER BY created_at DESC
        """)

        templates = cursor.fetchall()

        for template in templates:
            if template.get('created_at'):
                template['created_at'] = str(template['created_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "templates": templates
        }), 200

    except mysql.connector.Error as err:
        print("LEGAL DOCUMENT TEMPLATES ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/legal-documents/save', methods=['POST'])
def save_legal_document():
    try:
        data = request.get_json()

        user_id = data.get('user_id')
        document_type = data.get('document_type')
        document_content = data.get('document_content')

        if not user_id or not document_type or not document_content:
            return jsonify({
                "success": False,
                "message": "Missing required document information"
            }), 400

        document_id = "doc_" + uuid.uuid4().hex[:20]

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO legal_document_templates
            (
                id,
                title,
                icon,
                color,
                record_type,
                template_id,
                user_id,
                document_content,
                saved_at
            )
            SELECT
                %s,
                title,
                icon,
                color,
                'DOCUMENT',
                id,
                %s,
                %s,
                NOW()
            FROM legal_document_templates
            WHERE id = %s
              AND record_type = 'TEMPLATE'
        """, (
            document_id,
            user_id,
            document_content,
            document_type
        ))

        if cursor.rowcount == 0:
            conn.rollback()
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Document template not found"
            }), 404

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Document saved successfully",
            "document_id": document_id
        }), 201

    except mysql.connector.Error as err:
        print("LEGAL DOCUMENT SAVE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/legal-documents/<int:user_id>', methods=['GET'])
def get_saved_legal_documents(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                title,
                icon,
                color,
                template_id,
                user_id,
                document_content,
                saved_at
            FROM legal_document_templates
            WHERE record_type = 'DOCUMENT'
              AND user_id = %s
            ORDER BY saved_at DESC
        """, (user_id,))

        documents = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "documents": documents
        }), 200

    except mysql.connector.Error as err:
        print("LEGAL DOCUMENT FETCH ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/legal-documents/<document_id>', methods=['DELETE'])
def delete_saved_legal_document(document_id):
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({
                "success": False,
                "message": "User ID is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM legal_document_templates
            WHERE id = %s
              AND user_id = %s
              AND record_type = 'DOCUMENT'
        """, (document_id, user_id))

        if cursor.rowcount == 0:
            conn.rollback()
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Saved document not found"
            }), 404

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Document deleted successfully"
        }), 200

    except mysql.connector.Error as err:
        print("LEGAL DOCUMENT DELETE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/legal-documents/<document_id>', methods=['GET'])
def get_saved_legal_document(document_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                title,
                document_content,
                saved_at
            FROM legal_document_templates
            WHERE id = %s
              AND record_type = 'DOCUMENT'
        """, (document_id,))

        document = cursor.fetchone()

        cursor.close()
        conn.close()

        if not document:
            return jsonify({
                "success": False,
                "message": "Saved document not found"
            }), 404

        return jsonify({
            "success": True,
            "document": document
        }), 200

    except mysql.connector.Error as err:
        print("LEGAL DOCUMENT DOWNLOAD ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/legal-document-templates/<template_id>', methods=['GET'])
def get_legal_document_template(template_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                title,
                icon,
                color,
                template_content,
                submission_place,
                required_documents,
                next_steps,
                checklist_items
            FROM legal_document_templates
            WHERE id = %s
              AND record_type = 'TEMPLATE'
        """, (template_id,))

        template = cursor.fetchone()

        cursor.close()
        conn.close()

        if not template:
            return jsonify({
                "success": False,
                "message": "Legal document template not found"
            }), 404

        return jsonify({
            "success": True,
            "template": template
        }), 200

    except mysql.connector.Error as err:
        print("LEGAL DOCUMENT TEMPLATE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# admin add new template
@app.route('/api/admin/legal-document-templates', methods=['POST'])
def add_admin_legal_document_template():
    try:
        data = request.get_json()

        template_id = data.get('id')
        title = data.get('title')
        icon = data.get('icon')
        color = data.get('color')
        template_content = data.get('template_content')
        submission_place = data.get('submission_place')
        required_documents = data.get('required_documents')
        next_steps = data.get('next_steps')
        checklist_items = data.get('checklist_items')

        if not template_id or not title or not template_content:
            return jsonify({
                "success": False,
                "message": "Template ID, title and template content are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check duplicate template ID
        cursor.execute("""
            SELECT id
            FROM legal_document_templates
            WHERE id = %s
        """, (template_id,))

        if cursor.fetchone():
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "A template with this ID already exists"
            }), 409

        cursor.execute("""
            INSERT INTO legal_document_templates
            (
                id,
                title,
                icon,
                color,
                record_type,
                template_content,
                submission_place,
                required_documents,
                next_steps,
                checklist_items,
                created_at
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                'TEMPLATE',
                %s,
                %s,
                %s,
                %s,
                %s,
                NOW()
            )
        """, (
            template_id,
            title,
            icon or 'bi-file-earmark-text',
            color or '#0d6efd',
            template_content,
            submission_place or '',
            required_documents or '',
            next_steps or '',
            checklist_items or ''
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Document template added successfully"
        }), 201

    except mysql.connector.Error as err:
        print("ADMIN DOCUMENT TEMPLATE ADD ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# admin - edit template
@app.route('/api/admin/legal-document-templates/<template_id>', methods=['PUT'])
def update_admin_legal_document_template(template_id):
    try:
        data = request.get_json()

        title = data.get('title')
        icon = data.get('icon')
        color = data.get('color')
        template_content = data.get('template_content')
        submission_place = data.get('submission_place')
        required_documents = data.get('required_documents')
        next_steps = data.get('next_steps')
        checklist_items = data.get('checklist_items')

        if not title or not template_content:
            return jsonify({
                "success": False,
                "message": "Title and template content are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check that the template exists
        cursor.execute("""
            SELECT id
            FROM legal_document_templates
            WHERE id = %s
              AND record_type = 'TEMPLATE'
        """, (template_id,))

        if not cursor.fetchone():
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Document template not found"
            }), 404

        cursor.execute("""
            UPDATE legal_document_templates
            SET
                title = %s,
                icon = %s,
                color = %s,
                template_content = %s,
                submission_place = %s,
                required_documents = %s,
                next_steps = %s,
                checklist_items = %s
            WHERE id = %s
              AND record_type = 'TEMPLATE'
        """, (
            title,
            icon or 'bi-file-earmark-text',
            color or '#0d6efd',
            template_content,
            submission_place or '',
            required_documents or '',
            next_steps or '',
            checklist_items or '',
            template_id
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Document template updated successfully"
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN DOCUMENT TEMPLATE UPDATE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# admin - delete template
@app.route('/api/admin/legal-document-templates/<template_id>', methods=['DELETE'])
def delete_admin_legal_document_template(template_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check that the template exists
        cursor.execute("""
            SELECT id
            FROM legal_document_templates
            WHERE id = %s
              AND record_type = 'TEMPLATE'
        """, (template_id,))

        if not cursor.fetchone():
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Document template not found"
            }), 404

        # Delete the template
        cursor.execute("""
            DELETE FROM legal_document_templates
            WHERE id = %s
              AND record_type = 'TEMPLATE'
        """, (template_id,))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Document template deleted successfully"
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN DOCUMENT TEMPLATE DELETE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# admin - generated document
@app.route('/api/admin/legal-documents', methods=['GET'])
def get_admin_legal_documents():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                d.id,
                d.title,
                d.icon,
                d.color,
                d.template_id,
                d.user_id,
                u.full_name AS user_name,
                d.document_content,
                d.saved_at
            FROM legal_document_templates d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.record_type = 'DOCUMENT'
            ORDER BY d.saved_at DESC
        """)

        documents = cursor.fetchall()

        for document in documents:
            if document.get('saved_at'):
                document['saved_at'] = str(document['saved_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "documents": documents
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN LEGAL DOCUMENTS ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# ============================================================
# MAIN GOVERNMENT SCHEME FINDER
# ============================================================

@app.route('/api/government-schemes', methods=['GET'])
def get_main_government_schemes():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                scheme_name,
                department,
                scheme_category,
                category,
                state,
                gender,
                occupation,
                age_group,
                income_range,
                description,
                eligibility,
                benefits,
                documents,
                application_method,
                official_link,
                deadline,
                status
            FROM main_government_schemes
            WHERE status = 'Active'
            ORDER BY id ASC
        """)

        schemes = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "schemes": schemes
        }), 200

    except mysql.connector.Error as err:
        print("MAIN GOVERNMENT SCHEMES ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/saved-schemes/<int:user_id>', methods=['GET'])
def get_saved_schemes(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT scheme_id
            FROM saved_schemes
            WHERE user_id = %s
            ORDER BY saved_at DESC
        """, (user_id,))

        saved = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "saved_schemes": saved
        }), 200

    except mysql.connector.Error as err:
        return jsonify({
            "success": False,
            "message": str(err)
        }), 500
@app.route('/api/saved-schemes', methods=['POST'])
def save_scheme():
    try:
        data = request.get_json()

        user_id = data.get('user_id')
        scheme_id = data.get('scheme_id')

        if not user_id or not scheme_id:
            return jsonify({
                "success": False,
                "message": "User ID and scheme ID are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO saved_schemes (user_id, scheme_id)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE saved_at = saved_at
        """, (user_id, scheme_id))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Scheme saved successfully"
        }), 200

    except mysql.connector.Error as err:
        return jsonify({
            "success": False,
            "message": str(err)
        }), 500
@app.route('/api/saved-schemes', methods=['DELETE'])
def delete_saved_scheme():
    try:
        data = request.get_json()

        user_id = data.get('user_id')
        scheme_id = data.get('scheme_id')

        if not user_id or not scheme_id:
            return jsonify({
                "success": False,
                "message": "User ID and scheme ID are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM saved_schemes
            WHERE user_id = %s AND scheme_id = %s
        """, (user_id, scheme_id))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Scheme removed"
        }), 200

    except mysql.connector.Error as err:
        return jsonify({
            "success": False,
            "message": str(err)
        }), 500
# Admin - overview
@app.route('/api/admin/overview', methods=['GET'])
def admin_overview():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # User counts
        cursor.execute("""
            SELECT
                SUM(role = 'citizen') AS total_citizens,
                SUM(role = 'worker') AS total_workers
            FROM users
        """)
        user_counts = cursor.fetchone()

        # Service request counts
        cursor.execute("""
            SELECT
                COUNT(*) AS total_requests,
                SUM(LOWER(status) = 'pending') AS pending_requests,
                SUM(LOWER(status) = 'accepted') AS accepted_requests,
                SUM(LOWER(status) = 'scheduled') AS scheduled_requests,
                SUM(LOWER(status) = 'completed') AS completed_requests,
                SUM(LOWER(status) = 'rejected') AS rejected_requests,
                SUM(LOWER(status) = 'cancelled') AS cancelled_requests
            FROM service_requests
        """)
        request_counts = cursor.fetchone()

        # Worker verification counts
        cursor.execute("""
            SELECT
                SUM(verified = 1) AS verified_workers,
                SUM(verified = 0) AS pending_workers
            FROM workers
        """)
        worker_counts = cursor.fetchone()

        # Scheme count
        cursor.execute("""
            SELECT COUNT(*) AS total_schemes
            FROM main_government_schemes
        """)
        scheme_count = cursor.fetchone()

        # Recent service requests
        cursor.execute("""
            SELECT
                sr.id,
                sr.service_type,
                sr.status,
                sr.request_date,
                sr.request_time,
                sr.created_at,
                cu.full_name AS citizen_name,
                wu.full_name AS worker_name
            FROM service_requests sr
            JOIN users cu ON sr.citizen_id = cu.id
            JOIN workers w ON sr.worker_id = w.id
            JOIN users wu ON w.user_id = wu.id
            ORDER BY sr.created_at DESC
            LIMIT 5
        """)
        recent_requests = cursor.fetchall()

        for request in recent_requests:
            if request.get('created_at'):
                request['created_at'] = str(request['created_at'])

            if request.get('request_date'):
                request['request_date'] = str(request['request_date'])

            if request.get('request_time'):
                request['request_time'] = str(request['request_time'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,

            "stats": {
                "citizens": user_counts["total_citizens"] or 0,
                "workers": user_counts["total_workers"] or 0,
                "service_requests": request_counts["total_requests"] or 0,
                "pending_requests": request_counts["pending_requests"] or 0,
                "accepted_requests": request_counts["accepted_requests"] or 0,
                "scheduled_requests": request_counts["scheduled_requests"] or 0,
                "completed_requests": request_counts["completed_requests"] or 0,
                "rejected_requests": request_counts["rejected_requests"] or 0,
                "cancelled_requests": request_counts["cancelled_requests"] or 0,
                "verified_workers": worker_counts["verified_workers"] or 0,
                "pending_workers": worker_counts["pending_workers"] or 0,
                "schemes": scheme_count["total_schemes"] or 0
            },

            "recent_requests": recent_requests
        }), 200

    except Exception as e:
        print("Admin overview error:", e)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# Admin - users
@app.route('/api/admin/users', methods=['GET'])
def get_admin_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.role,
                u.phone,
                u.location,
                u.preferred_language,
                u.status,
                u.created_at,
                w.languages AS worker_languages
            FROM users u
            LEFT JOIN workers w ON u.id = w.user_id
            WHERE u.role IN ('citizen', 'worker')
            ORDER BY u.created_at DESC
        """)

        users = cursor.fetchall()

        for user in users:
            if user.get('created_at'):
                user['created_at'] = str(user['created_at'])

            # Use worker languages for workers
            if user['role'] == 'worker':
                user['preferred_language'] = user.get('worker_languages')

            user.pop('worker_languages', None)

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "users": users
        }), 200

    except Exception as e:
        print("Admin users error:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500

@app.route('/api/admin/users/<int:user_id>/status', methods=['PUT'])
def update_admin_user_status(user_id):
    try:
        data = request.get_json()
        status = data.get('status')

        if status not in ['active', 'blocked']:
            return jsonify({
                "success": False,
                "message": "Invalid status"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE users
            SET status = %s
            WHERE id = %s
              AND role IN ('citizen', 'worker')
        """, (status, user_id))

        conn.commit()

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"User {status} successfully"
        }), 200

    except Exception as e:
        print("Update user status error:", e)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# ADMIN - GET ALL WORKERS
@app.route('/api/admin/workers', methods=['GET'])
def get_admin_workers():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                w.id,
                w.user_id,
                u.full_name,
                u.email,
                u.phone,
                w.primary_skill,
                w.other_skills,
                w.location,
                w.area,
                w.experience_years,
                w.languages,
                w.services_offered,
                w.about,
                w.charges,
                w.certifications,
                w.previous_work_experience,
                w.rating,
                w.review_count,
                w.verified,
                w.verification_status,
                w.created_at
            FROM workers w
            JOIN users u ON w.user_id = u.id
            ORDER BY w.created_at DESC
        """)

        workers = cursor.fetchall()

        for worker in workers:
            if worker.get('created_at'):
                worker['created_at'] = str(worker['created_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "workers": workers
        }), 200

    except Exception as e:
        print("Admin workers error:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# ADMIN - UPDATE WORKER VERIFICATION
@app.route('/api/admin/workers/<int:worker_id>/verification', methods=['PUT'])
def update_worker_verification(worker_id):
    try:
        data = request.get_json()
        status = data.get('status')

        if status not in ['approved', 'rejected']:
            return jsonify({
                "success": False,
                "message": "Invalid verification status"
            }), 400

        verified = 1 if status == 'approved' else 0

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE workers
            SET verification_status = %s,
                verified = %s
            WHERE id = %s
        """, (status, verified, worker_id))

        conn.commit()

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Worker not found"
            }), 404

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Worker {status} successfully"
        }), 200

    except Exception as e:
        print("Worker verification error:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# ADMIN - GET ALL GOVERNMENT SCHEMES
@app.route('/api/admin/schemes', methods=['GET'])
def get_admin_schemes():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. JOB ASSISTANT SCHEMES
        # Get actual job category names through category_scheme_mapping
        cursor.execute("""
            SELECT
                gs.*,
                GROUP_CONCAT(
                    DISTINCT jc.category_name
                    ORDER BY jc.category_name
                    SEPARATOR ', '
                ) AS categories
            FROM government_schemes gs
            LEFT JOIN category_scheme_mapping csm
                ON gs.id = csm.scheme_id
            LEFT JOIN job_categories jc
                ON csm.category_id = jc.id
            GROUP BY gs.id
            ORDER BY gs.id DESC
        """)

        job_schemes = cursor.fetchall()

        # 2. WOMEN'S PROTECTION & RIGHTS
        cursor.execute("""
            SELECT *
            FROM women_government_schemes
            ORDER BY id DESC
        """)

        women_schemes = cursor.fetchall()

        # 3. GOVERNMENT SCHEME FINDER
        cursor.execute("""
            SELECT *
            FROM main_government_schemes
            ORDER BY id DESC
        """)

        main_schemes = cursor.fetchall()

        # Prepare Job Assistant schemes
        for scheme in job_schemes:
            scheme['coverage'] = 'Central Government'

            if scheme.get('created_at'):
                scheme['created_at'] = str(scheme['created_at'])

        # Prepare Women's schemes
        for scheme in women_schemes:
            scheme['coverage'] = scheme.get('scheme_level') or 'Not specified'

            if scheme.get('created_at'):
                scheme['created_at'] = str(scheme['created_at'])

        # Prepare Government Scheme Finder schemes
        for scheme in main_schemes:
            scheme['coverage'] = scheme.get('state') or 'Not specified'

            if scheme.get('deadline'):
                scheme['deadline'] = str(scheme['deadline'])

            if scheme.get('created_at'):
                scheme['created_at'] = str(scheme['created_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "job_assistant": job_schemes,
            "women_rights": women_schemes,
            "government_finder": main_schemes
        }), 200

    except Exception as e:
        print("Admin schemes error:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# ADMIN - GET SINGLE GOVERNMENT SCHEME
@app.route('/api/admin/schemes/<string:domain>/<int:scheme_id>', methods=['GET'])
def get_admin_scheme(domain, scheme_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # JOB ASSISTANT
        if domain == 'job_assistant':

            cursor.execute("""
                SELECT *
                FROM government_schemes
                WHERE id = %s
            """, (scheme_id,))

            scheme = cursor.fetchone()

            if scheme:
                cursor.execute("""
                    SELECT jc.category_name
                    FROM category_scheme_mapping csm
                    JOIN job_categories jc
                        ON csm.category_id = jc.id
                    WHERE csm.scheme_id = %s
                    ORDER BY jc.category_name
                """, (scheme_id,))

                categories = cursor.fetchall()

                scheme['categories'] = [
                    row['category_name']
                    for row in categories
                ]

        # WOMEN'S PROTECTION & RIGHTS
        elif domain == 'women_rights':

            cursor.execute("""
                SELECT *
                FROM women_government_schemes
                WHERE id = %s
            """, (scheme_id,))

            scheme = cursor.fetchone()

        # GOVERNMENT SCHEME FINDER
        elif domain == 'government_finder':

            cursor.execute("""
                SELECT *
                FROM main_government_schemes
                WHERE id = %s
            """, (scheme_id,))

            scheme = cursor.fetchone()

        else:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Invalid scheme domain"
            }), 400

        cursor.close()
        conn.close()

        if not scheme:
            return jsonify({
                "success": False,
                "message": "Scheme not found"
            }), 404

        # Convert date/timestamp values to strings
        for key, value in scheme.items():
            if hasattr(value, 'strftime'):
                scheme[key] = str(value)

        return jsonify({
            "success": True,
            "scheme": scheme
        }), 200

    except Exception as e:
        print("Admin scheme details error:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# ADMIN - UPDATE GOVERNMENT SCHEME
@app.route('/api/admin/schemes/<string:domain>/<int:scheme_id>', methods=['PUT'])
def update_admin_scheme(domain, scheme_id):
    try:
        data = request.get_json()

        conn = get_db_connection()
        cursor = conn.cursor()

        # -----------------------------------------
        # JOB ASSISTANT
        # -----------------------------------------
        if domain == 'job_assistant':
            # First check whether the scheme actually exists
            cursor.execute("""
            SELECT id
            FROM government_schemes
            WHERE id = %s
            """, (scheme_id,))
            existing_scheme = cursor.fetchone()
            if not existing_scheme:
                cursor.close()
                conn.close()
                return jsonify({
                    "success": False,
                    "message": "Scheme not found"
                    }), 404
            # Update scheme details
            cursor.execute("""
                UPDATE government_schemes
                SET
                    scheme_name = %s,
                    ministry = %s,
                    scheme_type = %s,
                    description = %s,
                    eligibility = %s,
                    benefits = %s,
                    application_method = %s,
                    official_link = %s,
                    status = %s
                WHERE id = %s
            """, (
                data.get('scheme_name'),
                data.get('ministry'),
                data.get('scheme_type'),
                data.get('description'),
                data.get('eligibility'),
                data.get('benefits'),
                data.get('application_method'),
                data.get('official_link'),
                data.get('status') or 'Active',
                scheme_id
            ))
            # Update job category mappings
            if 'category_ids' in data:
                cursor.execute("""
                    DELETE FROM category_scheme_mapping
                    WHERE scheme_id = %s
                """, (scheme_id,))

                category_ids = data.get('category_ids') or []
                for category_id in category_ids:
                    cursor.execute("""
                        INSERT INTO category_scheme_mapping
                        (category_id, scheme_id)
                        VALUES (%s, %s)
                    """, (category_id, scheme_id))
        # -----------------------------------------
        # WOMEN'S PROTECTION & RIGHTS
        # -----------------------------------------
        elif domain == 'women_rights':

            cursor.execute("""
                UPDATE women_government_schemes
                SET
                    scheme_name = %s,
                    scheme_level = %s,
                    category = %s,
                    description = %s,
                    eligibility = %s,
                    benefits = %s,
                    documents = %s,
                    application_method = %s,
                    official_link = %s,
                    status = %s,
                    eligibility_tags = %s
                WHERE id = %s
            """, (
                data.get('scheme_name'),
                data.get('scheme_level'),
                data.get('category'),
                data.get('description'),
                data.get('eligibility'),
                data.get('benefits'),
                data.get('documents'),
                data.get('application_method'),
                data.get('official_link'),
                data.get('status') or 'Active',
                data.get('eligibility_tags'),
                scheme_id
            ))

            if cursor.rowcount == 0:
                cursor.close()
                conn.close()
                return jsonify({
                    "success": False,
                    "message": "Scheme not found"
                }), 404

        # -----------------------------------------
        # GOVERNMENT SCHEME FINDER
        # -----------------------------------------
        elif domain == 'government_finder':

            cursor.execute("""
                UPDATE main_government_schemes
                SET
                    scheme_name = %s,
                    department = %s,
                    scheme_category = %s,
                    category = %s,
                    state = %s,
                    gender = %s,
                    occupation = %s,
                    age_group = %s,
                    income_range = %s,
                    description = %s,
                    eligibility = %s,
                    benefits = %s,
                    documents = %s,
                    application_method = %s,
                    official_link = %s,
                    deadline = %s,
                    status = %s
                WHERE id = %s
            """, (
                data.get('scheme_name'),
                data.get('department'),
                data.get('scheme_category'),
                data.get('category'),
                data.get('state'),
                data.get('gender'),
                data.get('occupation'),
                data.get('age_group'),
                data.get('income_range'),
                data.get('description'),
                data.get('eligibility'),
                data.get('benefits'),
                data.get('documents'),
                data.get('application_method'),
                data.get('official_link'),
                data.get('deadline') or None,
                data.get('status') or 'Active',
                scheme_id
            ))

            if cursor.rowcount == 0:
                cursor.close()
                conn.close()
                return jsonify({
                    "success": False,
                    "message": "Scheme not found"
                }), 404

        # -----------------------------------------
        # INVALID DOMAIN
        # -----------------------------------------
        else:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "Invalid scheme domain"
            }), 400

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Scheme updated successfully"
        }), 200

    except Exception as e:
        print("Update admin scheme error:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# ADMIN - DELETE GOVERNMENT SCHEME
@app.route('/api/admin/schemes/<string:domain>/<int:scheme_id>', methods=['DELETE'])
def delete_admin_scheme(domain, scheme_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # -----------------------------------------
        # JOB ASSISTANT
        # -----------------------------------------
        if domain == 'job_assistant':

            # Remove category mappings first
            cursor.execute("""
                DELETE FROM category_scheme_mapping
                WHERE scheme_id = %s
            """, (scheme_id,))

            # Delete scheme
            cursor.execute("""
                DELETE FROM government_schemes
                WHERE id = %s
            """, (scheme_id,))

        # -----------------------------------------
        # WOMEN'S PROTECTION & RIGHTS
        # -----------------------------------------
        elif domain == 'women_rights':

            cursor.execute("""
                DELETE FROM women_government_schemes
                WHERE id = %s
            """, (scheme_id,))

        # -----------------------------------------
        # GOVERNMENT SCHEME FINDER
        # -----------------------------------------
        elif domain == 'government_finder':

            cursor.execute("""
                DELETE FROM main_government_schemes
                WHERE id = %s
            """, (scheme_id,))

        # -----------------------------------------
        # INVALID DOMAIN
        # -----------------------------------------
        else:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Invalid scheme domain"
            }), 400

        # Check whether scheme existed
        if cursor.rowcount == 0:
            conn.rollback()
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Scheme not found"
            }), 404

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Scheme deleted successfully"
        }), 200

    except Exception as e:
        print("Delete admin scheme error:", e)

        if 'conn' in locals():
            conn.rollback()

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
@app.route('/api/admin/schemes', methods=['POST'])
def add_admin_scheme():
    try:
        data = request.get_json()
        domain = data.get('domain')

        conn = get_db_connection()
        cursor = conn.cursor()

        if domain == 'job_assistant':

            cursor.execute("""
                INSERT INTO government_schemes
                (
                    scheme_name,
                    ministry,
                    scheme_type,
                    description,
                    eligibility,
                    benefits,
                    application_method,
                    official_link,
                    status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data.get('scheme_name'),
                data.get('ministry'),
                data.get('scheme_type'),
                data.get('description'),
                data.get('eligibility'),
                data.get('benefits'),
                data.get('application_method'),
                data.get('official_link'),
                data.get('status') or 'Active'
            ))

            scheme_id = cursor.lastrowid

            category_ids = data.get('category_ids') or []

            for category_id in category_ids:
                cursor.execute("""
                    INSERT INTO category_scheme_mapping
                    (category_id, scheme_id)
                    VALUES (%s, %s)
                """, (category_id, scheme_id))

        elif domain == 'women_rights':

            cursor.execute("""
                INSERT INTO women_government_schemes
                (
                    scheme_name,
                    scheme_level,
                    category,
                    description,
                    eligibility,
                    benefits,
                    documents,
                    application_method,
                    official_link,
                    status,
                    eligibility_tags
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data.get('scheme_name'),
                data.get('scheme_level'),
                data.get('category'),
                data.get('description'),
                data.get('eligibility'),
                data.get('benefits'),
                data.get('documents'),
                data.get('application_method'),
                data.get('official_link'),
                data.get('status') or 'Active',
                data.get('eligibility_tags')
            ))

        elif domain == 'government_finder':

            cursor.execute("""
                INSERT INTO main_government_schemes
                (
                    scheme_name,
                    department,
                    scheme_category,
                    category,
                    state,
                    gender,
                    occupation,
                    age_group,
                    income_range,
                    description,
                    eligibility,
                    benefits,
                    documents,
                    application_method,
                    official_link,
                    deadline,
                    status
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                data.get('scheme_name'),
                data.get('department'),
                data.get('scheme_category'),
                data.get('category'),
                data.get('state'),
                data.get('gender'),
                data.get('occupation'),
                data.get('age_group'),
                data.get('income_range'),
                data.get('description'),
                data.get('eligibility'),
                data.get('benefits'),
                data.get('documents'),
                data.get('application_method'),
                data.get('official_link'),
                data.get('deadline') or None,
                data.get('status') or 'Active'
            ))

        else:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Invalid scheme domain"
            }), 400

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Scheme added successfully"
        }), 201

    except Exception as e:
        print("Add admin scheme error:", e)

        if 'conn' in locals():
            conn.rollback()

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500
# admin - contents - legal rights
@app.route('/api/admin/women/legal-rights', methods=['POST'])
def add_women_legal_right():
    try:
        data = request.get_json()

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO women_legal_rights
            (category_id, category_title, category_icon, category_color,
             category_description, right_title, right_description,
             key_points, law, action)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            data.get('category_id'),
            data.get('category_title'),
            data.get('category_icon'),
            data.get('category_color'),
            data.get('category_description'),
            data.get('right_title'),
            data.get('right_description'),
            data.get('key_points'),
            data.get('law'),
            data.get('action')
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Legal right added"}), 201

    except mysql.connector.Error as err:
        return jsonify({"success": False, "message": "Database error", "error": str(err)}), 500


@app.route('/api/admin/women/legal-rights/<int:right_id>', methods=['PUT'])
def update_women_legal_right(right_id):
    try:
        data = request.get_json()

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE women_legal_rights
            SET category_id=%s, category_title=%s, category_icon=%s,
                category_color=%s, category_description=%s,
                right_title=%s, right_description=%s,
                key_points=%s, law=%s, action=%s
            WHERE id=%s
        """, (
            data.get('category_id'),
            data.get('category_title'),
            data.get('category_icon'),
            data.get('category_color'),
            data.get('category_description'),
            data.get('right_title'),
            data.get('right_description'),
            data.get('key_points'),
            data.get('law'),
            data.get('action'),
            right_id
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Legal right updated"}), 200

    except mysql.connector.Error as err:
        return jsonify({"success": False, "message": "Database error", "error": str(err)}), 500


@app.route('/api/admin/women/legal-rights/<int:right_id>', methods=['DELETE'])
def delete_women_legal_right(right_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM women_legal_rights WHERE id=%s",
            (right_id,)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Legal right deleted"}), 200

    except mysql.connector.Error as err:
        return jsonify({"success": False, "message": "Database error", "error": str(err)}), 500
# admin - evidence checklist
@app.route('/api/admin/women/evidence-checklists', methods=['POST'])
def add_women_evidence_checklist():
    try:
        data = request.get_json()

        situation_id = data.get('situation_id')
        situation_title = data.get('situation_title')
        situation_icon = data.get('situation_icon')
        situation_color = data.get('situation_color')
        evidence_item = data.get('evidence_item')

        if not situation_id or not situation_title or not evidence_item:
            return jsonify({
                "success": False,
                "message": "Situation ID, situation title and evidence item are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO women_evidence_checklists
            (
                situation_id,
                situation_title,
                situation_icon,
                situation_color,
                evidence_item
            )
            VALUES (%s, %s, %s, %s, %s)
        """, (
            situation_id,
            situation_title,
            situation_icon or 'bi-check2-square',
            situation_color or '#198754',
            evidence_item
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Evidence checklist added successfully"
        }), 201

    except mysql.connector.Error as err:
        print("ADMIN EVIDENCE CHECKLIST ADD ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/admin/women/evidence-checklists/<int:checklist_id>', methods=['PUT'])
def update_women_evidence_checklist(checklist_id):
    try:
        data = request.get_json()

        situation_id = data.get('situation_id')
        situation_title = data.get('situation_title')
        situation_icon = data.get('situation_icon')
        situation_color = data.get('situation_color')
        evidence_item = data.get('evidence_item')

        if not situation_id or not situation_title or not evidence_item:
            return jsonify({
                "success": False,
                "message": "Situation ID, situation title and evidence item are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE women_evidence_checklists
            SET
                situation_id=%s,
                situation_title=%s,
                situation_icon=%s,
                situation_color=%s,
                evidence_item=%s
            WHERE id=%s
        """, (
            situation_id,
            situation_title,
            situation_icon or 'bi-check2-square',
            situation_color or '#198754',
            evidence_item,
            checklist_id
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Evidence checklist updated successfully"
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN EVIDENCE CHECKLIST UPDATE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/admin/women/evidence-checklists/<int:checklist_id>', methods=['DELETE'])
def delete_women_evidence_checklist(checklist_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM women_evidence_checklists
            WHERE id=%s
        """, (checklist_id,))

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Evidence checklist not found"
            }), 404

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Evidence checklist deleted successfully"
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN EVIDENCE CHECKLIST DELETE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# admin - legal aid helplines
@app.route('/api/admin/women/legal-aid', methods=['POST'])
def add_women_legal_aid():
    try:
        data = request.get_json()

        name = data.get('name')
        purpose = data.get('purpose')
        who_can_use = data.get('who_can_use')
        contact = data.get('contact')
        website = data.get('website')
        description = data.get('description')
        icon = data.get('icon')
        color = data.get('color')

        if not name:
            return jsonify({
                "success": False,
                "message": "Name is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO women_legal_aid_helplines
            (
                icon,
                color,
                name,
                purpose,
                who_can_use,
                contact,
                website,
                description
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            icon or 'bi-telephone',
            color or '#198754',
            name,
            purpose or '',
            who_can_use or '',
            contact or '',
            website or '',
            description or ''
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Legal aid added successfully"
        }), 201

    except mysql.connector.Error as err:
        print("ADMIN LEGAL AID ADD ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/admin/women/legal-aid/<int:aid_id>', methods=['PUT'])
def update_women_legal_aid(aid_id):
    try:
        data = request.get_json()

        name = data.get('name')
        purpose = data.get('purpose')
        who_can_use = data.get('who_can_use')
        contact = data.get('contact')
        website = data.get('website')
        description = data.get('description')
        icon = data.get('icon')
        color = data.get('color')

        if not name:
            return jsonify({
                "success": False,
                "message": "Name is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE women_legal_aid_helplines
            SET
                icon=%s,
                color=%s,
                name=%s,
                purpose=%s,
                who_can_use=%s,
                contact=%s,
                website=%s,
                description=%s
            WHERE id=%s
        """, (
            icon or 'bi-telephone',
            color or '#198754',
            name,
            purpose or '',
            who_can_use or '',
            contact or '',
            website or '',
            description or '',
            aid_id
        ))

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Legal aid record not found"
            }), 404

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Legal aid updated successfully"
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN LEGAL AID UPDATE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/admin/women/legal-aid/<int:aid_id>', methods=['DELETE'])
def delete_women_legal_aid(aid_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM women_legal_aid_helplines
            WHERE id=%s
        """, (aid_id,))

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Legal aid record not found"
            }), 404

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Legal aid deleted successfully"
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN LEGAL AID DELETE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# admin - awareness articles
@app.route('/api/admin/women/awareness-articles', methods=['POST'])
def add_women_awareness_article():
    try:
        data = request.get_json()

        title = data.get('title')
        category = data.get('category')
        excerpt = data.get('excerpt')
        content = data.get('content')
        article_date = data.get('article_date')
        author = data.get('author')

        if not title or not category or not content:
            return jsonify({
                "success": False,
                "message": "Title, category and content are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO women_awareness_articles
            (
                title,
                category,
                excerpt,
                content,
                article_date,
                author
            )
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (
            title,
            category,
            excerpt or '',
            content,
            article_date or None,
            author or ''
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Awareness article added successfully"
        }), 201

    except mysql.connector.Error as err:
        print("ADMIN AWARENESS ARTICLE ADD ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/admin/women/awareness-articles/<int:article_id>', methods=['PUT'])
def update_women_awareness_article(article_id):
    try:
        data = request.get_json()

        title = data.get('title')
        category = data.get('category')
        excerpt = data.get('excerpt')
        content = data.get('content')
        article_date = data.get('article_date')
        author = data.get('author')

        if not title or not category or not content:
            return jsonify({
                "success": False,
                "message": "Title, category and content are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE women_awareness_articles
            SET
                title=%s,
                category=%s,
                excerpt=%s,
                content=%s,
                article_date=%s,
                author=%s
            WHERE id=%s
        """, (
            title,
            category,
            excerpt or '',
            content,
            article_date or None,
            author or '',
            article_id
        ))

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Awareness article not found"
            }), 404

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Awareness article updated successfully"
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN AWARENESS ARTICLE UPDATE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
@app.route('/api/admin/women/awareness-articles/<int:article_id>', methods=['DELETE'])
def delete_women_awareness_article(article_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM women_awareness_articles
            WHERE id=%s
        """, (article_id,))

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Awareness article not found"
            }), 404

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Awareness article deleted successfully"
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN AWARENESS ARTICLE DELETE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Admin - send notification
@app.route('/api/admin/notifications', methods=['POST'])
def send_admin_notification():
    try:
        data = request.get_json()

        title = data.get('title')
        message = data.get('message')
        target_audience = data.get('target_audience')

        if not title or not message or not target_audience:
            return jsonify({
                "success": False,
                "message": "Title, message and target audience are required"
            }), 400

        if target_audience not in ['ALL', 'CITIZENS', 'WORKERS']:
            return jsonify({
                "success": False,
                "message": "Invalid target audience"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO notifications
            (
                title,
                message,
                icon,
                color,
                target_audience
            )
            VALUES (%s,%s,%s,%s,%s)
        """, (
            title,
            message,
            'bi-bell-fill',
            '#4f46e5',
            target_audience
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Notification sent successfully"
        }), 201

    except mysql.connector.Error as err:
        print("ADMIN NOTIFICATION ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Get notifications for a user
@app.route('/api/notifications/<int:user_id>', methods=['GET'])
def get_user_notifications(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT role
            FROM users
            WHERE id=%s
        """, (user_id,))

        user = cursor.fetchone()

        if not user:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        role = user['role'].upper()

        cursor.execute("""
            SELECT
                n.id,
                n.title,
                n.message,
                n.icon,
                n.color,
                n.target_audience,
                n.created_at,
                CASE
                    WHEN nr.notification_id IS NULL THEN 1
                    ELSE 0
                END AS unread
            FROM notifications n
            LEFT JOIN notification_reads nr
                ON n.id = nr.notification_id
                AND nr.user_id = %s
            WHERE
                n.target_audience = 'ALL'
                OR (n.target_audience = 'CITIZENS' AND %s = 'CITIZEN')
                OR (n.target_audience = 'WORKERS' AND %s = 'WORKER')
            ORDER BY n.created_at DESC
        """, (user_id, role, role))

        notifications = cursor.fetchall()

        for n in notifications:
            if n.get('created_at'):
                n['created_at'] = str(n['created_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "notifications": notifications
        }), 200

    except mysql.connector.Error as err:
        print("GET USER NOTIFICATIONS ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Mark all notifications as read
@app.route('/api/notifications/<int:user_id>/read-all', methods=['PUT'])
def mark_all_notifications_read(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                n.id
            FROM notifications n
            JOIN users u
                ON u.id = %s
            LEFT JOIN notification_reads nr
                ON n.id = nr.notification_id
                AND nr.user_id = %s
            WHERE
                nr.notification_id IS NULL
                AND (
                    n.target_audience = 'ALL'
                    OR (n.target_audience = 'CITIZENS' AND u.role = 'citizen')
                    OR (n.target_audience = 'WORKERS' AND u.role = 'worker')
                )
        """, (user_id, user_id))

        notification_ids = cursor.fetchall()

        for row in notification_ids:
            cursor.execute("""
                INSERT INTO notification_reads
                (notification_id, user_id)
                VALUES (%s,%s)
            """, (row[0], user_id))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "All notifications marked as read"
        }), 200

    except mysql.connector.Error as err:
        print("MARK NOTIFICATIONS READ ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# admin- to see all type notifications 
@app.route('/api/admin/notifications', methods=['GET'])
def get_admin_notifications():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                title,
                message,
                icon,
                color,
                target_audience,
                created_at
            FROM notifications
            ORDER BY created_at DESC
        """)

        notifications = cursor.fetchall()

        for n in notifications:
            if n.get('created_at'):
                n['created_at'] = str(n['created_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "notifications": notifications
        }), 200

    except mysql.connector.Error as err:
        print("GET ADMIN NOTIFICATIONS ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Admin - delete notification
@app.route('/api/admin/notifications/<int:notification_id>', methods=['DELETE'])
def delete_admin_notification(notification_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id
            FROM notifications
            WHERE id = %s
        """, (notification_id,))

        notification = cursor.fetchone()

        if not notification:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Notification not found"
            }), 404

        cursor.execute("""
            DELETE FROM notifications
            WHERE id = %s
        """, (notification_id,))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Notification deleted successfully"
        }), 200

    except mysql.connector.Error as err:
        print("DELETE ADMIN NOTIFICATION ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# user/worker - submit feedback
@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()

        user_id = data.get('user_id')
        subject = data.get('subject')
        message = data.get('message')

        if not user_id or not subject or not message:
            return jsonify({
                "success": False,
                "message": "User, subject and message are required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO feedback_messages
            (user_id, subject, message, status)
            VALUES (%s, %s, %s, 'NEW')
        """, (user_id, subject, message))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Feedback submitted successfully"
        }), 201

    except mysql.connector.Error as err:
        print("SUBMIT FEEDBACK ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Admin - get feedback
@app.route('/api/admin/feedback', methods=['GET'])
def get_admin_feedback():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                f.id,
                f.user_id,
                u.full_name AS user_name,
                f.subject,
                f.message,
                f.status,
                f.admin_reply,
                f.reply_history,
                f.replied_at,
                f.created_at
            FROM feedback_messages f
            JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
        """)

        feedback = cursor.fetchall()

        for item in feedback:
            if item.get('created_at'):
                item['created_at'] = str(item['created_at'])

            if item.get('replied_at'):
                item['replied_at'] = str(item['replied_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "feedback": feedback
        }), 200

    except mysql.connector.Error as err:
        print("GET ADMIN FEEDBACK ERROR:", err)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# admin  - read feedback
@app.route('/api/admin/feedback/<int:feedback_id>/read', methods=['PUT'])
def mark_feedback_as_read(feedback_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE feedback_messages
            SET status = 'READ'
            WHERE id = %s
        """, (feedback_id,))

        conn.commit()

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "Feedback not found"
            }), 404

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Feedback marked as read"
        }), 200

    except mysql.connector.Error as err:
        print("MARK FEEDBACK READ ERROR:", err)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Admin reply to feedback
@app.route('/api/admin/feedback/<int:feedback_id>/reply', methods=['PUT'])
def reply_to_feedback(feedback_id):
    try:
        data = request.get_json()
        admin_reply = data.get('admin_reply', '').strip()

        if not admin_reply:
            return jsonify({
                "success": False,
                "message": "Reply message is required"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE feedback_messages
            SET
                reply_history = JSON_ARRAY_APPEND(
                    COALESCE(reply_history, JSON_ARRAY()),
                    '$',
                    JSON_OBJECT(
                        'reply', %s,
                        'replied_at', NOW()
                    )
                ),
                admin_reply = %s,
                replied_at = NOW(),
                status = 'REPLIED'
            WHERE id = %s
        """, (admin_reply, admin_reply, feedback_id))

        conn.commit()

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Feedback not found"
            }), 404

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Reply sent successfully"
        }), 200

    except mysql.connector.Error as err:
        print("REPLY TO FEEDBACK ERROR:", err)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# admin - delete feedback
@app.route('/api/admin/feedback/<int:feedback_id>', methods=['DELETE'])
def delete_feedback(feedback_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id
            FROM feedback_messages
            WHERE id = %s
        """, (feedback_id,))

        feedback = cursor.fetchone()

        if not feedback:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Feedback not found"
            }), 404

        cursor.execute("""
            DELETE FROM feedback_messages
            WHERE id = %s
        """, (feedback_id,))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Feedback deleted successfully"
        }), 200

    except mysql.connector.Error as err:
        print("DELETE FEEDBACK ERROR:", err)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# user - to read admin feedback
@app.route('/api/feedback/<int:user_id>', methods=['GET'])
def get_user_feedback(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                subject,
                message,
                status,
                reply_history,
                created_at,
                replied_at
            FROM feedback_messages
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))

        feedback = cursor.fetchall()

        for item in feedback:
            if item.get('created_at'):
                item['created_at'] = str(item['created_at'])

            if item.get('replied_at'):
                item['replied_at'] = str(item['replied_at'])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "feedback": feedback
        }), 200

    except mysql.connector.Error as err:
        print("GET USER FEEDBACK ERROR:", err)

        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500
# Admin - reports
@app.route('/api/admin/reports', methods=['GET'])
def get_admin_reports():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # =========================================================
        # 1. SERVICE REQUESTS BY STATUS
        # =========================================================
        cursor.execute("""
            SELECT
                status,
                COUNT(*) AS count
            FROM service_requests
            GROUP BY status
            ORDER BY count DESC
        """)
        requests_by_status = cursor.fetchall()

        # =========================================================
        # 2. MOST REQUESTED WORKER CATEGORIES
        # =========================================================
        cursor.execute("""
            SELECT
                w.primary_skill AS category,
                COUNT(sr.id) AS request_count
            FROM service_requests sr
            JOIN workers w ON sr.worker_id = w.id
            WHERE w.primary_skill IS NOT NULL
              AND w.primary_skill != ''
            GROUP BY w.primary_skill
            ORDER BY request_count DESC
            LIMIT 10
        """)
        popular_categories = cursor.fetchall()

        # =========================================================
        # 3. WORKER RATING ANALYSIS
        # =========================================================
        cursor.execute("""
            SELECT
                ROUND(AVG(rating), 2) AS average_rating,
                COUNT(*) AS total_reviews
            FROM reviews
        """)
        rating_summary = cursor.fetchone()

        # =========================================================
        # 4. TOP RATED WORKERS
        # =========================================================
        cursor.execute("""
            SELECT
                w.id AS worker_id,
                u.full_name AS worker_name,
                ROUND(AVG(r.rating), 2) AS average_rating,
                COUNT(r.id) AS review_count
            FROM reviews r
            JOIN workers w ON r.worker_id = w.id
            JOIN users u ON w.user_id = u.id
            GROUP BY w.id, u.full_name
            HAVING COUNT(r.id) > 0
            ORDER BY average_rating DESC, review_count DESC
            LIMIT 10
        """)
        top_workers = cursor.fetchall()

        # =========================================================
        # 5. LEGAL DOCUMENTS BY TYPE
        # =========================================================
        cursor.execute("""
            SELECT
                title AS document_type,
                COUNT(*) AS generated_count
            FROM legal_document_templates
            WHERE record_type = 'DOCUMENT'
            GROUP BY title
            ORDER BY generated_count DESC
        """)
        documents_by_type = cursor.fetchall()

        # =========================================================
        # 6. FEEDBACK BY STATUS
        # =========================================================
        cursor.execute("""
            SELECT
                status,
                COUNT(*) AS count
            FROM feedback_messages
            GROUP BY status
            ORDER BY count DESC
        """)
        feedback_by_status = cursor.fetchall()

        # =========================================================
        # 7. USER REGISTRATION TREND
        # =========================================================
        cursor.execute("""
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                SUM(CASE WHEN role = 'citizen' THEN 1 ELSE 0 END) AS citizens,
                SUM(CASE WHEN role = 'worker' THEN 1 ELSE 0 END) AS workers
            FROM users
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        """)
        user_growth = cursor.fetchall()

        # =========================================================
        # 8. SERVICE REQUEST TREND
        # =========================================================
        cursor.execute("""
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                COUNT(*) AS request_count
            FROM service_requests
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        """)
        request_growth = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,

            "requests_by_status": requests_by_status,

            "popular_categories": popular_categories,

            "rating_summary": {
                "average_rating": round(
                    float(rating_summary["average_rating"] or 0), 2
                ),
                "total_reviews": rating_summary["total_reviews"] or 0
            },

            "top_workers": top_workers,

            "documents_by_type": documents_by_type,

            "feedback_by_status": feedback_by_status,

            "user_growth": user_growth,

            "request_growth": request_growth
        }), 200

    except mysql.connector.Error as err:
        print("ADMIN REPORTS DATABASE ERROR:", err)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Database error",
            "error": str(err)
        }), 500

    except Exception as e:
        print("ADMIN REPORTS ERROR:", e)

        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals():
            conn.close()

        return jsonify({
            "success": False,
            "message": "Unable to load reports",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True)  