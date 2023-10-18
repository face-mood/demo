import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import * as faceapi from 'face-api.js';
import './App.css'

export declare class FaceExpressions {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

const defaultValue = {
  neutral: 0,
  happy: 0,
  sad: 0,
  angry: 0,
  fearful: 0,
  disgusted: 0,
  surprised: 0,
};

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [captureVideo, setCaptureVideo] = useState(false);
  const [emotions, setEmotions] = useState<FaceExpressions>(defaultValue);

  const startVideo = async () => {
    setCaptureVideo(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300 } })

      const { current: video } = videoRef;
      if (!video) return;

      video.srcObject = stream;
      video.play();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const loadModels = async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
      ])
      startVideo();
      setModelsLoaded(true);
    }

    loadModels();
  }, []);

  const handleVideoOnPlay = () => {
    setInterval(async () => {
      if (!videoRef.current) return;

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      const { expressions } = detections?.[0] ?? {};

      setEmotions(expressions ?? defaultValue);
    }, 50)
  };

  const closeWebcam = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();

    if (!videoRef.current.srcObject) return;

    (videoRef.current.srcObject as MediaStream).getTracks().forEach(stream => stream.stop());
    setCaptureVideo(false);
  }, []);

  useEffect(() => {
    startVideo();

    return () => closeWebcam();
  }, [closeWebcam]);

  const listOfEmotionsAfterThreshold = useMemo(() => {
    return Object.entries(emotions)
      .filter(([, value]) => value > 0.5)
      // .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
      .map(([key, value]) => ({
      key,
      value: `${(value * 100).toFixed(2)}%`,
    }));
  }, [emotions])

  const isReady = modelsLoaded && captureVideo;

  if (!isReady) return <p>Loading...</p>

  return (
    <>
      <video
        ref={videoRef}
        onPlay={handleVideoOnPlay}
        width="720"
        height="560"
        autoPlay
        muted
      ></video>

      <ul style={{ position: 'fixed', bottom: 0, textAlign: 'left' }}>
        {listOfEmotionsAfterThreshold.map(({ key }) => (
          <li key={key}>
            {key}
          </li>
        ))}
      </ul>
    </>
  )
}

export default App
