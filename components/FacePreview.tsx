/**
 * 기준 얼굴 사진 미리보기 컴포넌트
 * - 단일 파일 업로드
 * - 업로드된 사진 미리보기
 */

"use client";

import { useRef } from "react";

interface FacePreviewProps {
  referencePhoto: { imageUrl: string; file: File } | null;
  onPhotoChange: (file: File | null) => void;
}

export default function FacePreview({
  referencePhoto,
  onPhotoChange,
}: FacePreviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoChange(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2 text-black">
          2. 본인의 얼굴이 잘 나온 기준 사진 1장을 업로드 해 주세요
        </h2>
        <p className="text-gray-600 text-sm mb-4 text-black">
          얼굴이 정면으로 잘 나온 사진을 사용하면 더 정확한 결과를 얻을 수
          있습니다.
        </p>

        <button
          onClick={handleClick}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          내 얼굴 사진 선택
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {referencePhoto && (
        <div className="inline-block">
          <div className="relative group">
            <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-green-500">
              <img
                src={referencePhoto.imageUrl}
                alt="기준 얼굴 사진"
                className="w-full h-full object-cover"
              />
            </div>

            {/* 삭제 버튼 */}
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="삭제"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-2">기준 사진</p>
        </div>
      )}
    </div>
  );
}
