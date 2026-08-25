# LinkedIn AI Studio & Auto-Bot 🤖📱

An end-to-end AI-powered LinkedIn content studio and automation pipeline. Create, optimize, and preview rich LinkedIn posts (with images and vision analysis) directly on your mobile phone or PC, and automatically publish to LinkedIn.

---

## 🌟 What's New in This Version

### 1. 📱 100% Standalone Mobile App (No PC Required)
- **Direct Multi-Model Engine**: Generates posts directly on your phone using **Google Gemini (2.0 Flash / 1.5 Pro)** or **NVIDIA NIM (Llama 3.2 90B Vision)** with intelligent error fallback.
- **Visual Context Mapping**: Select any sentence to attach related photos, or attach general screenshots/photos.
- **Offline & Autosave**: Real-time auto-saving ensures no draft or prompt is ever lost.

### 2. ❓ Interactive AI Clarification ("Ask Questions")
- Proactively analyzes raw notes to spot missing numbers, specific milestones, or target audience takeaways.
- Interactive 1-tap multiple-choice question chips to inject punchy viral details before final drafting.

### 3. 💡 Post Optimization Lab & Suggestions
- **1-Tap Hook Swapper**: Choose between *Contrarian*, *Storyteller*, and *Metric-Driven* hooks to immediately swap the opening lines.
- **CTA Enhancers**: Tailored discussion questions to boost comments.
- **Tone Morpher**: 1-click tone rewrites (*Executive*, *Casual Builder*, *High-Energy*, *Technical*).
- **Virality Score**: 0–100 score gauge with actionable diagnostic advice.

### 4. 👁️ Realistic LinkedIn Live Feed Mockup
- Pixel-perfect LinkedIn card preview with avatar, headline, expandable *“…see more”* toggle, and multi-image grid lightbox.
- 1-click **Copy Post** and **Native Share / Open LinkedIn**.

### 5. 📁 Projects & Queue Manager
- View all drafts as clickable project cards with status badges (*Draft*, *In Queue*, *Ready to Post*, *Posted*).
- Dedicated Send Queue to manage posts scheduled for PC auto-posting.

### 6. 🎨 Minimal Classic White & Aurora/Cyber Themes
- Minimalist Classic White (clean, distraction-free aesthetic).
- Gemini Luminous Aurora & NVIDIA Cyber Emerald themes.

---

## 📥 Direct Mobile APK Download from GitHub

This repository includes a GitHub Actions CI/CD workflow (`.github/workflows/build-apps.yml`) that automatically compiles the Android `.apk` on every push!

### How to Download on your Phone:
1. **From GitHub Releases**:
   - Go to the **Releases** tab on this GitHub repository.
   - Look for **`LinkedIn AI Studio - Latest Mobile Build`**.
   - Tap **`LinkedIn-AI-Studio-Mobile.apk`** to download directly to your phone and install!
2. **From GitHub Actions**:
   - Go to the **Actions** tab on GitHub → **Build and Release Mobile App**.
   - Tap the latest workflow run and download the **`LinkedIn-AI-Studio-Android-APK`** artifact.

---

## 🚀 Pushing to your GitHub Repository

To push this codebase and trigger the automated mobile APK build:

```bash
# 1. Add your GitHub repository remote (replace with your repository URL)
git remote add origin https://github.com/NetPranav/YOUR_REPOSITORY_NAME.git

# 2. Rename branch to main if desired (or stay on master)
git branch -M main

# 3. Push code to GitHub
git push -u origin main
```

*Once pushed, GitHub Actions will automatically start building your Android APK!*

---

## 🛠️ Local Development & Running the Backend

### 1. Python Backend
```bash
# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python main.py
```
*Or double-click `start_backend.bat` for automatic IP detection and startup.*

### 2. Frontend / Mobile App
```bash
cd lbot-source
npm install
npm run dev
```

---

## 🔐 Environment Variables (`.env`)

```env
# LinkedIn Credentials (for automated Playwright posting)
LINKEDIN_EMAIL=your_email@outlook.com
LINKEDIN_PASSWORD=your_password

# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

# NVIDIA NIM Configuration
NVIDIA_NIM_API_KEY=your_nvidia_nim_key
NVIDIA_NIM_MODEL=meta/llama-3.2-90b-vision-instruct

# Server Settings
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
```