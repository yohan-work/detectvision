/**
 * 대회 사진 업로드 컴포넌트
 * - 다중 파일 업로드
 * - 썸네일 그리드 표시
 * - 최대 50장 제한
 */

"use client";

import { useRef } from "react";

interface PhotoUploaderProps {
  photos: Array<{ id: string; imageUrl: string; file: File }>;
  onPhotosAdd: (files: File[]) => void;
  onPhotoRemove: (id: string) => void;
  maxPhotos?: number;
}

export default function PhotoUploader({
  photos,
  onPhotosAdd,
  onPhotoRemove,
  maxPhotos = 50,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // 최대 개수 체크
    if (photos.length + files.length > maxPhotos) {
      alert(`최대 ${maxPhotos}장까지 업로드 가능합니다.`);
      return;
    }

    onPhotosAdd(files);

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = (id: string) => {
    onPhotoRemove(id);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2 text-black">
          1. 대회 사진들을 여러 장 업로드 해 주세요
        </h2>
        <p className="text-gray-600 text-sm mb-4 text-black">
          최대 {maxPhotos}장까지 업로드 가능합니다.
        </p>

        <button
          onClick={handleClick}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          사진 선택
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {photos.length > 0 && (
        <div>
          <p className="text-gray-700 mb-3">
            업로드된 사진 <span className="font-semibold">{photos.length}</span>
            장
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.imageUrl}
                    alt="대회 사진"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
