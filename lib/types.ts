/**
 * 검출된 얼굴 정보
 * - descriptor: 얼굴의 128차원 벡터 표현 (얼굴 임베딩)
 * - box: 얼굴이 위치한 bounding box 좌표
 */
export interface DetectedFace {
  descriptor: Float32Array;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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
