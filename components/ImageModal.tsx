/**
 * 이미지 확대 모달 컴포넌트
 * - 클릭한 이미지를 크게 표시
 * - backdrop 클릭 or ESC 키로 닫기
 */

'use client';

import { useEffect } from 'react';

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (imageUrl) {
      document.addEventListener('keydown', handleEscape);
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-[90vh] w-full">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300 transition-colors"
          title="닫기 (ESC)"
        >
          ×
        </button>

        {/* 이미지 */}
        <img
          src={imageUrl}
          alt="확대된 이미지"
          className="w-full h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

