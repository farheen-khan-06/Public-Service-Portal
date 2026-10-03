# Public Service Portal

## Project Description
Public Service Portal is a web-based prototype developed as a final-year BSc Computer Science project. It provides a centralized platform for accessing public services through three main domains: Job Assistant, Women's Protection & Rights, and Government Scheme Finder.

## Main Modules

### 1. Job Assistant
- Search and filter skilled workers
- View worker profiles
- Send service requests
- Manage bookings
- Ratings and reviews
- Worker skills, certifications, portfolio and employment history
- Career roadmap and skill development

### 2. Women's Protection & Rights
- Know Your Rights
- Awareness Articles
- Document Checklist
- Legal Aid & Helpline Information
- Women's Government Schemes
- Legal Document Generator

### 3. Government Scheme Finder
- Search and filter government schemes
-personalized scheme finder
- View scheme details
- Save schemes

## User Roles
- Citizen
- Skilled Worker
- Admin

## Technology Stack
- HTML
- CSS
- JavaScript
- Bootstrap
- Python
- Flask
- MySQL
-- Visual Studio Code

## Project Structure

```text
public-service-portal/
├── backend/
│   ├── uploads/
│   └── app.py
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── .vscode/
├── .gitignore
└── README.md

## Database
The MySQL database backup is available in the `mysql` branch as:

public_service_portal.sql

## Running the Prototype

1. Install Python and MySQL.
2. Install the required Python packages.
3. Import `public_service_portal.sql` into MySQL.
4. Configure the database connection.
5. Start the Flask backend:
   `python app.py`
6. Open the frontend through the configured local development server.

## Repository
GitHub: https://github.com/farheen-khan-06/Public-Service-Portal