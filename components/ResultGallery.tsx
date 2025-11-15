/**
 * 결과 사진 갤러리 컴포넌트
 * - 매칭된 사진들을 그리드로 표시
 * - 각 사진에 유사도 퍼센트 표시
 * - 클릭 시 모달로 큰 이미지 표시
 */

'use client';

import { MatchResult } from '@/lib/types';

interface ResultGalleryProps {
  results: MatchResult[];
  onImageClick: (imageUrl: string) => void;
}

export default function ResultGallery({
  results,
  onImageClick,
}: ResultGalleryProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          일치하는 얼굴을 찾지 못했습니다.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          다른 사진을 사용하거나 기준 사진을 변경해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-700 mb-4">
        총 <span className="font-semibold text-green-600">{results.length}</span>장의 사진에서 내 얼굴을 찾았습니다.
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {results.map((result) => (
          <div
            key={result.photo.id}
            onClick={() => onImageClick(result.photo.imageUrl)}
            className="cursor-pointer group"
          >
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
              <img
                src={result.photo.imageUrl}
                alt="매칭된 사진"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* 유사도 배지 */}
              <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                {Math.round(result.score * 100)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

