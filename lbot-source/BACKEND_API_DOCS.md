# LinkedIn Draft Widget - Backend API Integration Guide

This document outlines how the macOS native LinkedIn widget communicates with the local backend. It is designed to help the backend developer understand the network requests originating from the frontend and how to parse the incoming data.

## System Architecture

- **Frontend:** Tauri + Next.js (React) desktop widget running natively on macOS.
- **Connection Type:** Local Network HTTP requests.
- **Endpoint:** `http://192.168.29.88:8000/process-post` (Configured inside the widget).
- **Protocol:** HTTP POST.
- **Content-Type:** `application/json`

## Trigger Condition

The widget sends a network request when the user clicks the **"Queue for AI"** button. The frontend performs local validation to ensure the text field is not empty before initiating the HTTP POST request. 

If the backend is unreachable or returns a non-200 HTTP status, the frontend will visually alert the user that the "AI is Disconnected".

## JSON Payload Schema

When a request is sent, the frontend bundles the draft text, tags, and any linked images into a single JSON payload. 

### Structure Overview
```ts
{
  "text": string,                 // The raw text of the LinkedIn post
  "tags": string[],               // Array of hashtag strings (without the '#' symbol)
  "imageLinks": [                 // Array of objects representing text-image relationships
    {
      "text": string,             // The specific text snippet the user highlighted
      "startIndex": number,       // Character start index of the highlighted text
      "endIndex": number,         // Character end index of the highlighted text
      "images": string[]          // Array of Base64 encoded strings of the attached local images
    }
  ],
  "timestamp": string             // ISO 8601 timestamp of when the request was queued
}
```

## Example Payload

Here is a real example of the JSON payload sent in the body of the `POST` request:

```json
{
  "text": "Just wrapped up an incredible hackathon weekend! The main stage was absolutely packed. I had a great time participating in the AI track and we actually won the grand prize! Huge thanks to everyone who made this possible.",
  "tags": [
    "hackathon",
    "AI",
    "winning"
  ],
  "imageLinks": [
    {
      "text": "The main stage was absolutely packed",
      "startIndex": 47,
      "endIndex": 83,
      "images": [
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD..."
      ]
    },
    {
      "text": "won the grand prize",
      "startIndex": 154,
      "endIndex": 173,
      "images": [
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA..."
      ]
    }
  ],
  "timestamp": "2026-04-25T14:35:12.451Z"
}
```

## Developer Notes for Backend

1. **Base64 Images:** The images are converted locally by the frontend into standard Base64 Data URIs (e.g., `data:image/jpeg;base64,...`). The backend will need to parse these strings, strip the metadata headers if necessary, and convert them back into binary buffers to save to disk or upload to a cloud bucket.
2. **Contextual Image Mapping:** The `imageLinks` array is the most critical feature. It maps specific images directly to specific sentences in the text using `startIndex` and `endIndex`. Your AI models should use this mapping to understand *why* the user attached those specific images and exactly where they belong contextually within the post.
3. **CORS:** Ensure your backend server running on `192.168.29.88:8000` has CORS enabled to accept POST requests, as Tauri's webview may enforce strict origin policies depending on how it's bundled.
