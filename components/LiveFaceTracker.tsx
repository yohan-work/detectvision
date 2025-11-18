/**
 * 실시간 얼굴 추적 컴포넌트
 * - 웹캠을 통한 실시간 얼굴 인식
 * - 표정, 나이, 성별 실시간 표시
 * - 얼굴 랜드마크 및 bounding box 시각화
 * - 현재 얼굴로 기준 사진 등록 기능
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { getDominantExpression, getExpressionEmoji, getExpressionLabel } from '@/lib/faceRecognition';

interface LiveFaceTrackerProps {
  isModelsLoaded: boolean;
  onCaptureFace: (file: File) => void;
}

export default function LiveFaceTracker({
  isModelsLoaded,
  onCaptureFace,
}: LiveFaceTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionInfo, setDetectionInfo] = useState<{
    faceCount: number;
    expression?: string;
    expressionEmoji?: string;
    expressionProb?: number;
    age?: number;
    gender?: string;
  } | null>(null);

  // 웹캠 시작
  const startWebcam = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('웹캠 접근 실패:', err);
      setError('웹캠에 접근할 수 없습니다. 카메라 권한을 확인해 주세요.');
    }
  };

  // 웹캠 중지
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsStreaming(false);
    setDetectionInfo(null);
  };

  // 실시간 얼굴 검출 루프
  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded || !isStreaming) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // 비디오가 준비되지 않았으면 대기
    if (video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
      return;
    }

    const displaySize = {
      width: video.videoWidth,
      height: video.videoHeight,
    };

    // Canvas 크기 설정
    if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
      faceapi.matchDimensions(canvas, displaySize);
    }

    try {
      // 얼굴 검출 (모든 정보 포함)
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.5,
        }))
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Canvas 초기화
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // 검출된 얼굴 그리기
      if (resizedDetections.length > 0) {
        // Bounding box와 랜드마크 그리기
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        // 첫 번째 얼굴 정보 저장
        const detection = resizedDetections[0];
        const expressions = detection.expressions;
        const dominantExpr = Object.entries(expressions).reduce((a, b) =>
          a[1] > b[1] ? a : b
        );

        setDetectionInfo({
          faceCount: resizedDetections.length,
          expression: dominantExpr[0],
          expressionEmoji: getExpressionEmoji(dominantExpr[0] as any),
          expressionProb: dominantExpr[1],
          age: Math.round(detection.age),
          gender: detection.gender === 'male' ? '남성' : '여성',
        });
      } else {
        setDetectionInfo({
          faceCount: 0,
        });
      }
    } catch (err) {
      console.error('얼굴 검출 오류:', err);
    }

    // 다음 프레임 (약 10fps)
    setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
    }, 100);
  };

  // 현재 프레임 캡처하여 기준 사진으로 등록
  const captureCurrentFace = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
          onCaptureFace(file);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  // 비디오 로드 완료 시 검출 시작
  useEffect(() => {
    if (isStreaming && isModelsLoaded && videoRef.current) {
      videoRef.current.addEventListener('loadeddata', () => {
        detectFaces();
      });
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStreaming, isModelsLoaded]);

  // 컴포넌트 언마운트 시 웹캠 중지
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black">실시간 얼굴 추적</h2>
        <div className="space-x-2">
          {!isStreaming ? (
            <button
              onClick={startWebcam}
              disabled={!isModelsLoaded}
              className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                isModelsLoaded
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              웹캠 시작
            </button>
          ) : (
            <>
              <button
                onClick={captureCurrentFace}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                현재 얼굴로 등록
              </button>
              <button
                onClick={stopWebcam}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                웹캠 중지
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 비디오 및 Canvas */}
      <div className="relative inline-block bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="max-w-full h-auto"
          style={{ display: isStreaming ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
          style={{ display: isStreaming ? 'block' : 'none' }}
        />
        {!isStreaming && (
          <div className="w-full h-64 flex items-center justify-center bg-gray-200">
            <p className="text-gray-500">웹캠을 시작하려면 위 버튼을 클릭하세요</p>
          </div>
        )}
      </div>

      {/* 검출 정보 표시 */}
      {isStreaming && detectionInfo && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2 text-black">검출 정보</h3>
          {detectionInfo.faceCount > 0 ? (
            <div className="space-y-2">
              <p className="text-gray-700">
                검출된 얼굴: <span className="font-semibold">{detectionInfo.faceCount}명</span>
              </p>
              {detectionInfo.expression && (
                <p className="text-gray-700">
                  표정: {detectionInfo.expressionEmoji}{' '}
                  <span className="font-semibold">
                    {getExpressionLabel(detectionInfo.expression as any)}
                  </span>{' '}
                  ({Math.round((detectionInfo.expressionProb || 0) * 100)}%)
                </p>
              )}
              {detectionInfo.age && (
                <p className="text-gray-700">
                  나이: <span className="font-semibold">약 {detectionInfo.age}세</span>
                </p>
              )}
              {detectionInfo.gender && (
                <p className="text-gray-700">
                  성별: <span className="font-semibold">{detectionInfo.gender}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">얼굴이 검출되지 않았습니다</p>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          💡 팁: "현재 얼굴로 등록" 버튼을 클릭하면 현재 프레임을 기준 얼굴 사진으로 사용할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

