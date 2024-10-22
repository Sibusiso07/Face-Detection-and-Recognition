from flask import Flask, request, jsonify
import cv2
import numpy as np
import os
import base64

app = Flask(__name__)

# Load pre-trained face detection model (Haar Cascades)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


# Helper function to decode base64 image
def decode_image(base64_image):
    image_data = base64_image.split(',')[1]  # Remove the data URI scheme part
    image = np.fromstring(base64.b64decode(image_data), np.uint8)
    image = cv2.imdecode(image, cv2.IMREAD_COLOR)
    return image


# Routes

# Image detection endpoint
@app.route('/detect-image', methods=['POST'])
def detect_image():
    file = request.files['image']
    image = np.fromstring(file.read(), np.uint8)
    img = cv2.imdecode(image, cv2.IMREAD_COLOR)

    faces = face_cascade.detectMultiScale(img, 1.1, 4)

    # Draw rectangles around the faces
    for (x, y, w, h) in faces:
        cv2.rectangle(img, (x, y), (x + w, y + h), (255, 0, 0), 2)

    # Save the result image
    result_path = os.path.join('static', 'detected_face.jpg')
    cv2.imwrite(result_path, img)

    return jsonify({'message': 'Face(s) detected', 'image_path': result_path})


# Video detection endpoint
@app.route('/detect-video', methods=['POST'])
def detect_video():
    file = request.files['video']
    video_path = os.path.join('static', 'uploaded_video.mp4')
    file.save(video_path)

    cap = cv2.VideoCapture(video_path)
    screenshots = []
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        faces = face_cascade.detectMultiScale(frame, 1.1, 4)

        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

        if len(faces) > 0:
            # Save a frame with faces detected
            frame_path = f'static/frame_{frame_count}.jpg'
            cv2.imwrite(frame_path, frame)
            screenshots.append(frame_path)

        frame_count += 1

    cap.release()
    return jsonify({'message': 'Face(s) detected in video', 'screenshots': screenshots})


# Camera detection endpoint
@app.route('/detect-camera', methods=['POST'])
def detect_camera():
    camera_index = request.json.get('camera_index', 0)
    cap = cv2.VideoCapture(camera_index)

    ret, frame = cap.read()
    if not ret:
        return jsonify({'message': 'Could not access camera'}), 400

    faces = face_cascade.detectMultiScale(frame, 1.1, 4)

    for (x, y, w, h) in faces:
        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

    result_path = os.path.join('static', 'camera_detected.jpg')
    cv2.imwrite(result_path, frame)

    cap.release()
    return jsonify({'message': 'Face(s) detected from camera', 'image_path': result_path})


# Live Camera Detection Endpoint
@app.route('/detect-live-camera', methods=['POST'])
def detect_live_camera():
    data = request.json

    # Get the base64-encoded image from the request
    base64_image = data.get('image')
    if not base64_image:
        return jsonify({'error': 'No image data received'}), 400

    # Decode the image
    image = decode_image(base64_image)

    # Convert image to grayscale for face detection
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Detect faces in the image
    faces = face_cascade.detectMultiScale(gray_image, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    # Prepare a response with the bounding boxes of detected faces
    face_list = []
    for (x, y, w, h) in faces:
        face_list.append({
            'x': int(x),
            'y': int(y),
            'width': int(w),
            'height': int(h)
        })

    # Return the coordinates of the detected faces
    return jsonify({'faces': face_list})


if __name__ == '__main__':
    app.run(debug=True)
