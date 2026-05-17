# LinkedIn Draft Widget - Backend API Documentation

This document outlines the API endpoints, data models, and network configurations for the LinkedIn Draft Widget backend. 

## Base Configuration

- **Host/IP:** The backend runs on a local network IP. Based on the config, it defaults to `192.168.29.224`. You will need to make sure the frontend targets the correct IP and port.
- **Port:** `8000`
- **Base URL:** `http://<BACKEND_IP>:8000` (e.g., `http://192.168.29.224:8000`)
- **CORS:** Enabled for all origins (`["*"]`), methods, and headers.
- **Static Images:** The backend serves processed images locally. They can be accessed via `http://<BACKEND_IP>:8000/images/<image_filename>`.

---

## Data Models

### `ImageLink`
Represents the contextual mapping between a piece of text and the images attached.
```json
{
  "text": "The highlighted text snippet",
  "startIndex": 0,
  "endIndex": 28,
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Base64 strings
  ]
}
```

### `SubmitRawRequest`
Sent by the widget when submitting a new draft.
```json
{
  "text": "Raw text of the LinkedIn post draft",
  "tags": ["AI", "Tech", "Frontend"],
  "imageLinks": [ /* Array of ImageLink objects */ ],
  "timestamp": "2026-04-26T12:00:00Z"
}
```

### `ApproveRequest`
Sent when the user approves a draft to be posted to LinkedIn.
```json
{
  "final_text": "Final edited post text to be posted to LinkedIn",
  "selected_image_paths": ["image1.jpg", "image2.png"] // Optional array of image filenames
}
```

---

## API Endpoints

### 1. Health Check
Checks if the backend is online and returns current AI processing load.
- **URL:** `/health`
- **Method:** `GET`
- **Response:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-04-26T03:45:00Z",
    "backend_ip": "192.168.29.224",
    "backend_port": 8000,
    "ollama_vision_model": "qwen2-vl",
    "ollama_text_model": "qwen2.5:14b",
    "active_drafts": 2,
    "pending_approval": 1,
    "processing": 1
  }
  ```

### 2. Submit Raw Content
Receives raw content from the frontend widget and queues it for AI processing.
- **URL:** `/submit-raw` (Alias: `/process-post`)
- **Method:** `POST`
- **Body:** `SubmitRawRequest` (See Data Models above)
- **Response:**
  ```json
  {
    "draft_id": "uuid-string-here",
    "status": "processing",
    "message": "Your content has been queued for AI processing...",
    "estimated_processing_time_seconds": 90
  }
  ```
*Note: The frontend is likely currently configured to use `/process-post`. This alias is fully supported.*

### 3. Check Pending Drafts
Polled by the MacBook frontend to check for completed drafts that are awaiting user approval.
- **URL:** `/check-drafts`
- **Method:** `GET`
- **Response:**
  ```json
  {
    "pending_count": 1,
    "drafts": [
      {
        "id": "uuid-string-here",
        "status": "awaiting_approval",
        "generated_post_text": "AI generated text for the post...",
        "tags": ["AI", "Tech"],
        "suggested_images": [
          "http://192.168.29.224:8000/images/image1.jpg"
        ],
        "vision_summary": "Description of the images...",
        "created_at": "2026-04-26T03:45:00Z"
      }
    ]
  }
  ```

### 4. Approve Draft & Post to LinkedIn
Triggered when the user approves a draft. The backend will post to LinkedIn in the background.
- **URL:** `/approve-draft/{draft_id}`
- **Method:** `POST`
- **Body:** `ApproveRequest` (See Data Models above)
- **Response:**
  ```json
  {
    "draft_id": "uuid-string-here",
    "linkedin_post_id": "pending",
    "linkedin_post_url": "pending",
    "message": "Draft approved! Publishing to LinkedIn in the background."
  }
  ```

### 5. Reject Draft
Removes a draft from the queue (optionally records feedback).
- **URL:** `/reject-draft/{draft_id}`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "feedback": "Optional feedback on why it was rejected"
  }
  ```
- **Response:**
  ```json
  {
    "draft_id": "uuid-string-here",
    "status": "rejected",
    "message": "Draft has been removed from the approval queue.",
    "feedback_recorded": true
  }
  ```

### 6. Check Draft Status
Used to poll the final status of a draft (e.g., after approval, to get the final LinkedIn post URL).
- **URL:** `/draft-status/{draft_id}`
- **Method:** `GET`
- **Response:**
  ```json
  {
    "draft_id": "uuid-string-here",
    "status": "posted",
    "created_at": "2026-04-26T03:40:00Z",
    "updated_at": "2026-04-26T03:45:00Z",
    "generated_post_text": "...",
    "final_approved_text": "...",
    "linkedin_post_id": "automation_success",
    "linkedin_post_url": "https://www.linkedin.com/in/me/recent-activity/shares/",
    "error_message": null,
    "tags": ["AI"],
    "suggested_image_count": 1,
    "image_urls": ["http://192.168.29.224:8000/images/image1.jpg"]
  }
  ```

## WebSocket or Realtime Connection
Currently, there are no WebSockets. The connection design relies on the frontend **polling** the `/check-drafts` endpoint (for pending approvals) and `/draft-status/{draft_id}` (for post completion).

## Important Implementation Notes for Frontend Developer
1. **Images Format:** When sending images via `/submit-raw`, they must be encoded as `Base64` Data URI strings (e.g., `data:image/jpeg;base64,...`).
2. **Serving Images:** When displaying the suggested images for a draft, you can directly use the URLs provided in the `suggested_images` array from the `/check-drafts` response, which look like `http://<BACKEND_IP>:8000/images/filename.jpg`.
3. **CORS is configured to accept all origins (`*`)**, so you shouldn't run into CORS issues. Make sure the laptop is connected to the same WiFi network and points to the right IP (`http://192.168.29.224:8000`).
4. **Approve Request Edit:** The frontend can submit edits to the AI generated text by passing the final intended text as `final_text` inside the `ApproveRequest` body.
