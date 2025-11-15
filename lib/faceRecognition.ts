/**
 * face-api.js를 사용한 얼굴 인식 유틸리티 함수들
 * 
 * 주요 기능:
 * 1. 모델 로드: face-api.js의 딥러닝 모델들을 로드
 * 2. 얼굴 검출: 이미지에서 얼굴을 찾고 descriptor 추출
 * 3. 거리 계산: 두 얼굴 descriptor 간의 유사도 계산
 * 4. 매칭: 기준 얼굴과 유사한 얼굴이 있는 사진 찾기
 */

import * as faceapi from 'face-api.js';
import { DetectedFace, MarathonPhoto, MatchResult } from './types';

/**
 * face-api.js 모델들을 public/models 경로에서 로드
 * 필요한 모델:
 * - TinyFaceDetector: 가벼운 얼굴 검출 모델
 * - FaceLandmark68Net: 얼굴 랜드마크 검출 (68개 포인트)
 * - FaceRecognitionNet: 얼굴 descriptor(임베딩) 추출
 * 
 * @returns Promise<void>
 */
export async function loadModels(): Promise<void> {
  const MODEL_URL = '/models';
  
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

/**
 * 이미지를 리사이즈하여 성능 최적화
 * 긴 변 기준으로 maxSize로 축소
 * 
 * @param img - HTMLImageElement
 * @param maxSize - 최대 크기 (기본 800px)
 * @returns 리사이즈된 HTMLCanvasElement
 */
function resizeImage(img: HTMLImageElement, maxSize: number = 800): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  let width = img.width;
  let height = img.height;
  
  // 긴 변 기준으로 리사이즈
  if (width > height && width > maxSize) {
    height = (height * maxSize) / width;
    width = maxSize;
  } else if (height > maxSize) {
    width = (width * maxSize) / height;
    height = maxSize;
  }
  
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  
  return canvas;
}

/**
 * 이미지 파일에서 얼굴들을 검출하고 descriptor 추출
 * 
 * 처리 과정:
 * 1. File 객체를 HTMLImageElement로 변환
 * 2. 이미지를 리사이즈하여 성능 최적화
 * 3. face-api.js로 얼굴 검출 + 랜드마크 + descriptor 추출
 * 4. 검출된 각 얼굴의 descriptor와 bounding box 반환
 * 
 * @param file - 이미지 파일
 * @returns Promise<DetectedFace[]> - 검출된 얼굴들의 배열
 */
export async function detectFacesInImage(file: File): Promise<DetectedFace[]> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      try {
        // 이미지 리사이즈로 성능 최적화
        const resizedCanvas = resizeImage(img, 800);
        
        // 얼굴 검출 + 랜드마크 + descriptor 추출
        // withFaceLandmarks: 얼굴의 68개 랜드마크 포인트 검출
        // withFaceDescriptors: 얼굴의 128차원 벡터 추출
        const detections = await faceapi
          .detectAllFaces(resizedCanvas, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();
        
        // DetectedFace 형식으로 변환
        const faces: DetectedFace[] = detections.map((detection) => ({
          descriptor: detection.descriptor,
          box: {
            x: detection.detection.box.x,
            y: detection.detection.box.y,
            width: detection.detection.box.width,
            height: detection.detection.box.height,
          },
        }));
        
        URL.revokeObjectURL(objectUrl);
        resolve(faces);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지 로드 실패'));
    };
    
    img.src = objectUrl;
  });
}

/**
 * 두 descriptor 간의 유클리드 거리 계산
 * 거리가 가까울수록 두 얼굴이 유사함
 * 
 * @param desc1 - 첫 번째 얼굴의 descriptor
 * @param desc2 - 두 번째 얼굴의 descriptor
 * @returns number - 유클리드 거리 (0에 가까울수록 유사)
 */
export function calculateDistance(
  desc1: Float32Array,
  desc2: Float32Array
): number {
  return faceapi.euclideanDistance(desc1, desc2);
}

/**
 * 기준 얼굴과 매칭되는 사진들을 찾기
 * 
 * 처리 과정:
 * 1. 각 대회 사진의 모든 얼굴들과 기준 얼굴의 거리 계산
 * 2. 사진당 가장 가까운 거리를 대표 거리로 사용
 * 3. threshold 이하인 사진만 매칭으로 간주
 * 4. score = max(0, 1 - distance)로 유사도 점수 계산
 * 5. score 내림차순으로 정렬
 * 
 * @param myDescriptor - 내 얼굴의 descriptor
 * @param photos - 대회 사진들 (얼굴 검출 완료된 상태)
 * @param threshold - 매칭 판단 임계값 (기본 0.6, 낮을수록 엄격)
 * @returns MatchResult[] - 매칭된 사진들 (score 내림차순)
 */
export function findMatchingPhotos(
  myDescriptor: Float32Array,
  photos: MarathonPhoto[],
  threshold: number = 0.6
): MatchResult[] {
  const results: MatchResult[] = [];
  
  // 각 사진에 대해 처리
  for (const photo of photos) {
    // 이 사진에서 검출된 얼굴이 없으면 스킵
    if (photo.faces.length === 0) {
      continue;
    }
    
    // 이 사진의 모든 얼굴들과 내 얼굴의 거리 계산
    const distances = photo.faces.map((face) =>
      calculateDistance(myDescriptor, face.descriptor)
    );
    
    // 가장 가까운 거리 (가장 유사한 얼굴)
    const minDistance = Math.min(...distances);
    
    // threshold 이하인 경우만 매칭으로 간주
    if (minDistance <= threshold) {
      // 유사도 점수 계산: 거리가 0이면 100%, 1이면 0%
      const score = Math.max(0, 1 - minDistance);
      
      results.push({
        photo,
        distance: minDistance,
        score,
      });
    }
  }
  
  // score 내림차순 정렬 (가장 유사한 사진이 먼저)
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

/**
 * 기준 사진에서 얼굴 1개 추출
 * 여러 얼굴이 검출되면 가장 큰 얼굴 선택
 * 
 * @param file - 기준 얼굴 사진 파일
 * @returns Promise<Float32Array | null> - 얼굴 descriptor (검출 실패 시 null)
 */
export async function extractReferenceFace(
  file: File
): Promise<Float32Array | null> {
  const faces = await detectFacesInImage(file);
  
  if (faces.length === 0) {
    return null;
  }
  
  // 여러 얼굴이 검출되면 가장 큰 얼굴 선택
  if (faces.length > 1) {
    faces.sort((a, b) => {
      const areaA = a.box.width * a.box.height;
      const areaB = b.box.width * b.box.height;
      return areaB - areaA;
    });
  }
  
  return faces[0].descriptor;
}

