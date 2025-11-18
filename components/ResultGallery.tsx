/**
 * 결과 사진 갤러리 컴포넌트
 * - 매칭된 사진들을 그리드로 표시
 * - 각 사진에 유사도 퍼센트 표시
 * - 클릭 시 모달로 큰 이미지 표시
 */

'use client';

import { MatchResult } from '@/lib/types';
import { getDominantExpression, getExpressionEmoji, getExpressionLabel, downloadCroppedFaces } from '@/lib/faceRecognition';

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
        {results.map((result) => {
          // 매칭된 얼굴 정보 가져오기 (가장 유사한 얼굴)
          const matchedFace = result.photo.faces.length > 0 ? result.photo.faces[0] : null;
          const dominantExpression = matchedFace?.expressions 
            ? getDominantExpression(matchedFace.expressions) 
            : null;
          
          return (
            <div
              key={result.photo.id}
              className="group"
            >
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                <img
                  src={result.photo.imageUrl}
                  alt="매칭된 사진"
                  onClick={() => onImageClick(result.photo.imageUrl)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                />
                
                {/* 유사도 배지 */}
                <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                  {Math.round(result.score * 100)}%
                </div>
                
                {/* 얼굴 크롭 다운로드 버튼 */}
                {matchedFace && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadCroppedFaces(result.photo);
                    }}
                    className="absolute top-2 left-2 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="얼굴만 다운로드"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                
                {/* 표정, 나이, 성별 정보 */}
                {matchedFace && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 표정 */}
                      {dominantExpression && matchedFace.expressions && (
                        <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                          {getExpressionEmoji(dominantExpression)}
                          <span>{getExpressionLabel(dominantExpression)}</span>
                          <span className="text-white/70">
                            {Math.round(matchedFace.expressions[dominantExpression] * 100)}%
                          </span>
                        </span>
                      )}
                      
                      {/* 나이 */}
                      {matchedFace.age !== undefined && (
                        <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                          약 {Math.round(matchedFace.age)}세
                        </span>
                      )}
                      
                      {/* 성별 */}
                      {matchedFace.gender && (
                        <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                          {matchedFace.gender === 'male' ? '👨 남성' : '👩 여성'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

