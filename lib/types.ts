/**
 * 얼굴 표정 타입 (7가지 감정)
 */
export type Expression = 'happy' | 'sad' | 'angry' | 'surprised' | 'disgusted' | 'fearful' | 'neutral';

/**
 * 표정 확률 정보
 * 각 표정에 대한 0~1 사이의 확률값
 */
export interface FaceExpressions {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  disgusted: number;
  fearful: number;
  neutral: number;
}

/**
 * 성별 정보
 */
export type Gender = 'male' | 'female';

/**
 * 검출된 얼굴 정보
 * - descriptor: 얼굴의 128차원 벡터 표현 (얼굴 임베딩)
 * - box: 얼굴이 위치한 bounding box 좌표
 * - expressions: 얼굴 표정 확률 정보 (선택적)
 * - age: 추정 나이 (선택적)
 * - gender: 추정 성별 (선택적)
 * - genderProbability: 성별 추정 확률 (0~1, 선택적)
 */
export interface DetectedFace {
  descriptor: Float32Array;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  expressions?: FaceExpressions;
  age?: number;
  gender?: Gender;
  genderProbability?: number;
}

/**
 * 마라톤 대회 사진 정보
 * - id: 고유 식별자 (UUID)
 * - file: 원본 파일 객체
 * - imageUrl: 브라우저에서 표시하기 위한 Object URL
 * - faces: 이 사진에서 검출된 얼굴들의 배열
 */
export interface MarathonPhoto {
  id: string;
  file: File;
  imageUrl: string;
  faces: DetectedFace[];
}

/**
 * 얼굴 매칭 결과
 * - photo: 매칭된 사진 정보
 * - distance: 내 얼굴과의 유클리드 거리 (낮을수록 유사함)
 * - score: 유사도 점수 (0~1, 높을수록 유사함)
 */
export interface MatchResult {
  photo: MarathonPhoto;
  distance: number;
  score: number; // 0~1 사이 값
}

/**
 * 분석 진행 상태
 */
export interface AnalysisProgress {
  current: number;
  total: number;
}
