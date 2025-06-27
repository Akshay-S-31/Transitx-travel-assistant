from flask import Flask, jsonify
from flask_cors import CORS  # <-- NEW
import cv2
import threading

app = Flask(__name__)
CORS(app)  # <-- ENABLE CORS HERE

crowd_density = 0

@app.route('/density')
def get_density():
    return jsonify({'density': crowd_density})

def run_flask():
    print("[INFO] Starting Flask server on port 5500...")
    app.run(host='0.0.0.0', port=5500)

threading.Thread(target=run_flask, daemon=True).start()

# ---- OpenCV & HOG logic below remains the same ----
# (Your HOG crowd density code here)

# Set up HOG-based human detector
hog = cv2.HOGDescriptor()
hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

# Initialize camera
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("[ERROR] Could not open camera.")
    exit(1)

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Could not read frame.")
            break

        # Resize for faster processing (optional)
        frame_resized = cv2.resize(frame, (640, 480))

        # Detect people using HOG
        rects, _ = hog.detectMultiScale(frame_resized,
                                        winStride=(4, 4),
                                        padding=(8, 8),
                                        scale=1.05)

        # Update density value
        crowd_density = len(rects)

        # Draw detections
        for (x, y, w, h) in rects:
            cv2.rectangle(frame_resized, (x, y), (x + w, y + h), (0, 255, 0), 2)

        # Overlay density info
        cv2.putText(frame_resized, f'Crowd Density: {crowd_density}', (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        # Show output
        cv2.imshow('Crowd Analyzer (HOG)', frame_resized)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("[INFO] Exiting on user request.")
            break

except Exception as e:
    print(f"[EXCEPTION] {e}")

finally:
    cap.release()
    cv2.destroyAllWindows()
    print("[INFO] Camera released. Program ended.")