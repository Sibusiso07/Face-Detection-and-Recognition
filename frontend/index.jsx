import React, { useState, useEffect, useRef } from "react";

const App = () => {
  const [image, setImage] = useState(null);
  const [imageResult, setImageResult] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoResult, setVideoResult] = useState([]);
  const [cameraResult, setCameraResult] = useState(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Handle Image Detection
  const handleImageUpload = async (e) => {
    e.preventDefault();
    let formData = new FormData();
    formData.append('image', image);

    const response = await fetch('http://localhost:5000/detect-image', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    setImageResult(result.image_path);
  };

  // Handle Video Detection
  const handleVideoUpload = async (e) => {
    e.preventDefault();
    let formData = new FormData();
    formData.append('video', video);

    const response = await fetch('http://localhost:5000/detect-video', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    setVideoResult(result.screenshots);
};

  // Handle Camera Detection.
  const handleCameraDetection = async () => {
    const response = await fetch('http://localhost:5000/detect-camera', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ camera_index: 0 }),
    });

    const result = await response.json();
    setCameraResult(result.image_path);
  };

  // Handle Live Camera Detection
  const startLiveCameraDetection = async () => {
    setIsLiveCameraActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;

    // Send the frames for detection and render the rectangles on the canvas
    const detectFacesInLiveCamera = async () => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      const video = videoRef.current;

      // Set Canvas Dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

      // Draw the video on the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert the canvas into an image and send it to the back-end
      const image = canvas.toDataURL('image/jpeg');
      const response = await fetch('http://localhost:5000/detect-live-camera', {
        method: 'POST',
        body: JSON.stringify({ image }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      // Draw rectagles on detected faces
      result.faces.forEach((face) => {
        context.strokeStyle = 'red';
        context.lineWidth = 2;
        context.strokeRect(face.x, face.y, face.width, face.height);
      });

      // Continue processing the video feed
      if (isLiveCameraActive) {
        requestAnimationFrame(detectFacesInLiveCamera);
      }
    };

    // Start the face detection process
    videoRef.current.onLoadeddata = () => {
      detectFacesInLiveCamera();
    };
  };

  // Stop live camera detection
  const stopLiveCameraDetection = () => {
    setIsLiveCameraActive(false);
    const stream = videoRef.current.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
  };

  // Handle image capture from the live camera
  const captureImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Store the captured image
    const capturedImage = canvas.toDataURL('image/png');
    setCapturedImages([...capturedImages, capturedImage]);
  };

  return (
    <div>
      <h1>Face Detection App</h1>

      {/* Image Detection */}
      <h2>Image Detection</h2>
      <form onSubmit={handleImageUpload}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
          required 
        />
        <button type="submit">Detect</button>
      </form>
      {imageResult && (
        <div>
          <h3>Detected Faces on Image</h3>
          <img 
            src={`http://localhost:5000/${imageResult}`}
            alt="Detected Faces"
            style={{ width: '300px' }}  
          />
        </div>
      )}

      {/* Video Detection */}
      <h2>Video Detection</h2>
      <form onSubmit={handleVideoUpload}>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideo(e.target.files[0])}
          required
        />
        <button>Detect</button>
      </form>
      {videoResult.length > 0 && (
        <div>
          <h3>Detected faces on Video</h3>
          {videoResult.map((screenshot, idx) => (
            <img
              key={idx}
              src={`http://localhost:5000/${screenshot}`}
              alt={`Screenshot ${idx}`}
              style={{ width: '300px', margin: '10px' }}
            />
          ))}
        </div>
      )}

      {/* Camera Detection */}
      <h2>Detect Faces from Camera</h2>
      <button onClick={handleCameraDetection}>Detect from Camera</button>
      {cameraResult && (
        <div>
          <h3>Detected Faces from Camera</h3>
          <img
            src={`http://localhost:5000/${cameraResult}`}
            alt="Detected Faces from Camera"
            style={{ width: '300px' }}
          />
        </div>
      )}

      {/* Live Camera Detection */}
      <h2>Live Camera Detection</h2>
      {!isLiveCameraActive ? (
        <button onClick={startLiveCameraDetection}>Start Live Camera</button>
      ) : (
        <button onClick={stopLiveCameraDetection}>Stop Live Camera</button>
      )}
      <button onClick={captureImage} disabled={!isLiveCameraActive}>
        Capture Image
      </button>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <h3>Live Camera Feed</h3>
          <video ref={videoRef} autoPlay muted style={{ width: '300px' }} />
        </div>
        <div>
          <h3>Detected Faces</h3>
          <canvas ref={canvasRef} style={{ width: '300px' }} />
        </div>
      </div>

      {/* Captured Images */}
      {capturedImages.length > 0 && (
        <div>
          <h3>Captured Images</h3>
          {capturedImages.map((img, idx) => (
            <img key={idx} src={img} alt={`Captured ${idx}`} style={{ width: '300px', margin: '10px' }} />
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
