"""
find_coordinates.py
-------------------
Run this file FIRST to find the exact coordinates on YOUR screen.
LinkedIn's layout depends on your screen resolution and browser zoom level.

HOW TO USE:
1. Run this file: python find_coordinates.py
2. Move your mouse to any element on screen
3. The script prints the X, Y coordinates every second
4. Note down the coordinates for each element listed below
5. Paste those coordinates into linkedin_poster.py

Run with: python find_coordinates.py
Press CTRL+C to stop
"""

import pyautogui
import time
import keyboard  # pip install keyboard

print("=" * 50)
print("COORDINATE FINDER - Move mouse to any element")
print("=" * 50)
print()
print("ELEMENTS YOU NEED TO FIND COORDINATES FOR:")
print("Follow this checklist one by one")
print()
print("STEP 1 - Open LinkedIn in browser first")
print("STEP 2 - Find these elements and note coordinates:")
print()
print("  [ ] 1. The 'Start a post' button (center of LinkedIn home feed)")
print("  [ ] 2. The text input area (inside the post popup)")
print("  [ ] 3. The image/photo upload icon (bottom of post popup)")
print("  [ ] 4. The file dialog - this opens your file explorer")
print("  [ ] 5. The 'Post' button (bottom right of post popup)")
print()
print("─" * 50)
print("LIVE COORDINATES (move your mouse):")
print("─" * 50)

try:
    while True:
        # Get current mouse position
        x, y = pyautogui.position()

        # Get screen size for reference
        screen_width, screen_height = pyautogui.size()

        # Print coordinates - \r overwrites the same line
        print(
            f"\r  Mouse Position → X: {x:4d}, Y: {y:4d}  "
            f"| Screen Size: {screen_width}x{screen_height}  ",
            end="",
            flush=True
        )

        time.sleep(0.1)  # Update 10 times per second

except KeyboardInterrupt:
    print("\n")
    print("=" * 50)
    print("Coordinate finder stopped.")
    print("Now paste your noted coordinates into linkedin_poster.py")
    print("=" * 50)



