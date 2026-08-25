# Automatic LinkedIn Bot 🤖

An end-to-end AI-powered LinkedIn automation pipeline. This project allows users to draft, preview, and automatically publish rich LinkedIn posts (including images) via a mobile app interface and a robust FastAPI backend.

It utilizes **Playwright** for headless browser automation (bypassing LinkedIn's anti-bot measures) and the **NVIDIA NIM API** for AI-driven post generation and image understanding.

---

## 🏗️ Architecture

The system is composed of several key modules:

1. **FastAPI Backend (`main.py`)**: The central hub that receives drafts from the mobile app, stores them in SQLite, and triggers the publishing pipeline upon approval.
2. **AI Pipeline (`ai_pipeline.py`)**: Integrates with `meta/llama-3.2-90b-vision-instruct` via the NVIDIA NIM API to generate highly engaging, context-aware post captions based on user prompts and attached images.
3. **LinkedIn Poster (`linkedin_poster.py`)**: A state-of-the-art Playwright automation script that safely signs into LinkedIn, navigates directly to the feed's post composer using a native URL hack (`?shareActive=true`), uploads images, and types the drafted text at human-like speeds.
4. **Mobile App (`lbot-source/`)**: A Capacitor/React-based frontend that allows users to review AI-generated drafts, edit them, and tap "Approve" to send them to the backend for publishing.

---

## ✨ Key Features

- **Anti-Bot Evasion**: Playwright is configured to hide `webdriver` flags and simulate human behaviors, reliably bypassing LinkedIn's strict automated detection.
- **Auto-Login & Session Persistence**: Uses `linkedin_state.json` to keep the bot logged in. It will only perform a full login (using `.env` credentials) if the session expires.
- **Bulletproof Trigger Mechanism**: Instead of relying on brittle CSS selectors that frequently break due to LinkedIn's A/B testing, the bot forces the post modal to open directly via the `shareActive=true` query parameter.
- **Dynamic IP Management (`update_ip.py`)**: Automatically detects the host machine's local IP address and updates the `.env` file so the mobile app can always find the backend on the local network.
- **Headless Execution (`startup.vbs`)**: Can run entirely in the background on Windows without keeping a terminal window open.

---

## 🚀 Setup & Installation

### 1. Prerequisites
- Python 3.10+
- Node.js (for the mobile frontend)
- Git

### 2. Install Dependencies
Open a terminal in the project root and create a virtual environment:
```bash
python -m venv venv
.\venv\Scripts\activate
```
Install the required Python packages:
```bash
pip install fastapi uvicorn playwright requests python-dotenv bs4 pydantic
```
Install the Playwright Chromium browser binaries:
```bash
playwright install chromium
```

### 3. Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Fill out the required fields in `.env`:
```env
# LinkedIn Credentials for Playwright Auto-Login
LINKEDIN_EMAIL=your_email@domain.com
LINKEDIN_PASSWORD=your_password

# NVIDIA NIM Configuration for AI Generation
NVIDIA_NIM_API_KEY=your_nvidia_api_key
NVIDIA_NIM_MODEL=meta/llama-3.2-90b-vision-instruct

# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
```

---

## 🏃‍♂️ Running the Backend

### Method 1: The Automated Batch Script (Recommended)
Simply double-click **`start_backend.bat`**. 
This script will:
1. Kill any stale backend processes running on port 8000.
2. Run `update_ip.py` to auto-detect your local Wi-Fi IP and update your `.env`.
3. Launch the FastAPI server.

### Method 2: Silent Background Service
If you want the backend to run silently on startup without a terminal window, double-click **`startup.vbs`**.

### Method 3: Manual Terminal Execution
```bash
.\venv\Scripts\activate
python main.py
```

---

## 📱 Mobile App Setup

The frontend is located in the `lbot-source` directory.
1. Navigate to the frontend directory:
   ```bash
   cd lbot-source
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the development server or build for Capacitor:
   ```bash
   npm run dev
   ```

---

## 🛠️ Troubleshooting

- **Crash: "Locator.wait_for: Timeout 15000ms exceeded"**
  This usually means LinkedIn changed their DOM structure or an invisible modal intercepted the bot. We mitigate this using the URL trigger (`?shareActive=true`) and strictly scoping selectors to `:visible`. Check `linkedin_poster.py` for the locator strategies.
- **Mobile app cannot connect to backend:**
  Ensure both your mobile device and your PC are on the same Wi-Fi network. Check the terminal output of `start_backend.bat` to verify the `BACKEND_IP` was correctly detected.
- **Session Expired:**
  If the bot fails to post, delete `linkedin_state.json`. The bot will automatically perform a fresh login using your `.env` credentials on the next run.