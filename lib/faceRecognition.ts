/**
 * face-api.js를 사용한 얼굴 인식 유틸리티 함수들
 *
 * 주요 기능:
 * 1. 모델 로드: face-api.js의 딥러닝 모델들을 로드
 * 2. 얼굴 검출: 이미지에서 얼굴을 찾고 descriptor 추출
 * 3. 거리 계산: 두 얼굴 descriptor 간의 유사도 계산
 * 4. 매칭: 기준 얼굴과 유사한 얼굴이 있는 사진 찾기
 */

import * as faceapi from "face-api.js";
import {
  DetectedFace,
  MarathonPhoto,
  MatchResult,
  Expression,
  FaceExpressions,
} from "./types";

/**
 * face-api.js 모델들을 public/models 경로에서 로드
 * 필요한 모델:
 * - TinyFaceDetector: 가벼운 얼굴 검출 모델
 * - FaceLandmark68Net: 얼굴 랜드마크 검출 (68개 포인트)
 * - FaceRecognitionNet: 얼굴 descriptor(임베딩) 추출
 * - FaceExpressionNet: 얼굴 표정 인식 (7가지 감정)
 * - AgeGenderNet: 나이 및 성별 추정
 *
 * @returns Promise<void>
 */
export async function loadModels(): Promise<void> {
  const MODEL_URL = "/models";

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
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
function resizeImage(
  img: HTMLImageElement,
  maxSize: number = 800
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

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
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        // 이미지 리사이즈로 성능 최적화
        const resizedCanvas = resizeImage(img, 800);

        // 얼굴 검출 + 랜드마크 + descriptor + 표정 + 나이/성별 추출
        // withFaceLandmarks: 얼굴의 68개 랜드마크 포인트 검출
        // withFaceDescriptors: 얼굴의 128차원 벡터 추출
        // withFaceExpressions: 7가지 감정 확률 추출
        // withAgeAndGender: 나이 및 성별 추정
        const detections = await faceapi
          .detectAllFaces(resizedCanvas, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withFaceExpressions()
          .withAgeAndGender();

        // DetectedFace 형식으로 변환
        const faces: DetectedFace[] = detections.map((detection) => ({
          descriptor: detection.descriptor,
          box: {
            x: detection.detection.box.x,
            y: detection.detection.box.y,
            width: detection.detection.box.width,
            height: detection.detection.box.height,
          },
          expressions: detection.expressions
            ? {
                happy: detection.expressions.happy,
                sad: detection.expressions.sad,
                angry: detection.expressions.angry,
                surprised: detection.expressions.surprised,
                disgusted: detection.expressions.disgusted,
                fearful: detection.expressions.fearful,
                neutral: detection.expressions.neutral,
              }
            : undefined,
          age: detection.age,
          gender: detection.gender as "male" | "female",
          genderProbability: detection.genderProbability,
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
      reject(new Error("이미지 로드 실패"));
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

/**
 * 표정에서 가장 높은 확률의 표정 반환
 *
 * @param expressions - 표정 확률 객체
 * @returns Expression - 가장 확률이 높은 표정
 */
export function getDominantExpression(
  expressions: FaceExpressions
): Expression {
  const entries = Object.entries(expressions) as [Expression, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

/**
 * 표정을 이모지로 변환
 *
 * @param expression - 표정 타입
 * @returns string - 해당하는 이모지
 */
export function getExpressionEmoji(expression: Expression): string {
  const emojiMap: Record<Expression, string> = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    surprised: "😲",
    disgusted: "🤢",
    fearful: "😨",
    neutral: "😐",
  };
  return emojiMap[expression];
}

/**
 * 표정을 한글로 변환
 *
 * @param expression - 표정 타입
 * @returns string - 한글 표정명
 */
export function getExpressionLabel(expression: Expression): string {
  const labelMap: Record<Expression, string> = {
    happy: "행복",
    sad: "슬픔",
    angry: "화남",
    surprised: "놀람",
    disgusted: "혐오",
    fearful: "두려움",
    neutral: "무표정",
  };
  return labelMap[expression];
}

/**
 * 이미지에서 얼굴 영역만 크롭
 *
 * @param imageUrl - 원본 이미지 URL
 * @param box - 얼굴 bounding box
 * @param padding - 여백 비율 (기본 0.2 = 20%)
 * @returns Promise<Blob> - 크롭된 이미지 Blob
 */
export async function cropFaceFromImage(
  imageUrl: string,
  box: { x: number; y: number; width: number; height: number },
  padding: number = 0.2
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas context를 생성할 수 없습니다."));
        return;
      }

      // 여백 계산
      const paddingX = box.width * padding;
      const paddingY = box.height * padding;

      // 크롭 영역 계산 (여백 포함, 이미지 경계 넘지 않도록)
      const cropX = Math.max(0, box.x - paddingX);
      const cropY = Math.max(0, box.y - paddingY);
      const cropWidth = Math.min(img.width - cropX, box.width + paddingX * 2);
      const cropHeight = Math.min(
        img.height - cropY,
        box.height + paddingY * 2
      );

      // Canvas 크기 설정
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // 이미지 크롭하여 그리기
      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // Blob으로 변환
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("이미지를 Blob으로 변환할 수 없습니다."));
          }
        },
        "image/jpeg",
        0.95
      );
    };

    img.onerror = () => {
      reject(new Error("이미지 로드 실패"));
    };

    img.crossOrigin = "anonymous";
    img.src = imageUrl;
  });
}

/**
 * 사진에서 모든 얼굴을 크롭하여 다운로드
 *
 * @param photo - 마라톤 사진 정보
 * @param faceIndex - 특정 얼굴 인덱스 (선택적, 없으면 모든 얼굴)
 */
export async function downloadCroppedFaces(
  photo: MarathonPhoto,
  faceIndex?: number
): Promise<void> {
  const facesToCrop =
    faceIndex !== undefined ? [photo.faces[faceIndex]] : photo.faces;

  if (facesToCrop.length === 0) {
    alert("크롭할 얼굴이 없습니다.");
    return;
  }

  try {
    for (let i = 0; i < facesToCrop.length; i++) {
      const face = facesToCrop[i];
      const blob = await cropFaceFromImage(photo.imageUrl, face.box);

      // 다운로드 링크 생성
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `face_${photo.file.name.replace(/\.[^/.]+$/, "")}_${
        i + 1
      }.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 다중 다운로드 시 약간의 지연 (브라우저 차단 방지)
      if (facesToCrop.length > 1 && i < facesToCrop.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    console.error("얼굴 크롭 실패:", error);
    alert("얼굴 크롭에 실패했습니다.");
  }
}
