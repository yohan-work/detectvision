"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import PhotoUploader from "@/components/PhotoUploader";
import FacePreview from "@/components/FacePreview";
import ResultGallery from "@/components/ResultGallery";
import ImageModal from "@/components/ImageModal";
import LiveFaceTracker from "@/components/LiveFaceTracker";
import { MarathonPhoto, MatchResult } from "@/lib/types";
import {
  loadModels,
  detectFacesInImage,
  extractReferenceFace,
  findMatchingPhotos,
} from "@/lib/faceRecognition";

export default function Home() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'matching' | 'live'>('matching');
  
  // 상태 관리
  const [marathonPhotos, setMarathonPhotos] = useState<MarathonPhoto[]>([]);
  const [referencePhoto, setReferencePhoto] = useState<{
    imageUrl: string;
    file: File;
  } | null>(null);
  const [myDescriptor, setMyDescriptor] = useState<Float32Array | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);

  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({
    current: 0,
    total: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // 페이지 로드 시 모델 로드
  useEffect(() => {
    const initModels = async () => {
      setIsLoadingModels(true);
      try {
        await loadModels();
        setIsModelsLoaded(true);
      } catch (error) {
        console.error("모델 로드 실패:", error);
        setErrorMessage(
          "모델을 로드하는 데 실패했습니다. 페이지를 새로고침해 주세요."
        );
      } finally {
        setIsLoadingModels(false);
      }
    };

    initModels();
  }, []);

  // 대회 사진 업로드 핸들러
  const handleMarathonPhotosAdd = (files: File[]) => {
    const newPhotos: MarathonPhoto[] = files.map((file) => ({
      id: uuidv4(),
      file,
      imageUrl: URL.createObjectURL(file),
      faces: [],
    }));

    // 기존 사진에 새 사진 추가
    setMarathonPhotos((prev) => [...prev, ...newPhotos]);
    // 새로운 사진 업로드 시 결과 초기화
    setMatchResults([]);
    setErrorMessage(null);
  };

  // 대회 사진 삭제 핸들러
  const handleMarathonPhotoRemove = (id: string) => {
    setMarathonPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      // Object URL 메모리 해제
      if (photo) {
        URL.revokeObjectURL(photo.imageUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
    // 사진 삭제 시 결과 초기화
    setMatchResults([]);
    setErrorMessage(null);
  };

  // 기준 사진 업로드 핸들러
  const handleReferencePhotoChange = (file: File | null) => {
    if (file) {
      setReferencePhoto({
        file,
        imageUrl: URL.createObjectURL(file),
      });
    } else {
      setReferencePhoto(null);
    }

    // 기준 사진 변경 시 결과 초기화
    setMyDescriptor(null);
    setMatchResults([]);
    setErrorMessage(null);
  };

  // 웹캠 캡처 핸들러
  const handleCaptureFace = (file: File) => {
    setReferencePhoto({
      file,
      imageUrl: URL.createObjectURL(file),
    });
    setMyDescriptor(null);
    setMatchResults([]);
    setErrorMessage(null);
    // 매칭 탭으로 전환
    setActiveTab('matching');
  };

  // 분석 실행 핸들러
  const handleAnalyze = async () => {
    // 유효성 검사
    if (!referencePhoto) {
      setErrorMessage("기준 얼굴 사진을 업로드해 주세요.");
      return;
    }

    if (marathonPhotos.length === 0) {
      setErrorMessage("대회 사진들을 업로드해 주세요.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setMatchResults([]);

    try {
      // 1. 기준 사진에서 얼굴 추출
      const descriptor = await extractReferenceFace(referencePhoto.file);

      if (!descriptor) {
        setErrorMessage(
          "업로드된 기준 사진에서 얼굴을 찾지 못했습니다. 얼굴이 정면으로 나온 사진을 사용해 주세요."
        );
        setIsAnalyzing(false);
        return;
      }

      setMyDescriptor(descriptor);

      // 2. 각 대회 사진에서 얼굴 검출
      const updatedPhotos: MarathonPhoto[] = [];

      for (let i = 0; i < marathonPhotos.length; i++) {
        const photo = marathonPhotos[i];
        setAnalysisProgress({ current: i + 1, total: marathonPhotos.length });

        try {
          const faces = await detectFacesInImage(photo.file);
          updatedPhotos.push({
            ...photo,
            faces,
          });
        } catch (error) {
          console.error(`사진 분석 실패 (${photo.file.name}):`, error);
          // 실패한 사진은 얼굴 0개로 처리
          updatedPhotos.push({
            ...photo,
            faces: [],
          });
        }
      }

      setMarathonPhotos(updatedPhotos);

      // 3. 얼굴이 검출된 사진이 하나라도 있는지 확인
      const totalFaces = updatedPhotos.reduce(
        (sum, photo) => sum + photo.faces.length,
        0
      );

      if (totalFaces === 0) {
        setErrorMessage(
          "대회 사진들에서 얼굴을 찾지 못했습니다. 다른 사진을 사용해 주세요."
        );
        setIsAnalyzing(false);
        return;
      }

      // 4. 매칭 수행 (threshold: 0.6)
      const matches = findMatchingPhotos(descriptor, updatedPhotos, 0.6);
      setMatchResults(matches);

      if (matches.length === 0) {
        setErrorMessage(
          "일치하는 얼굴을 찾지 못했습니다. 기준 사진을 변경하거나 다른 대회 사진을 사용해 보세요."
        );
      }
    } catch (error) {
      console.error("분석 실패:", error);
      setErrorMessage("분석 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress({ current: 0, total: 0 });
    }
  };

  // 분석 버튼 활성화 여부
  const isAnalyzeDisabled =
    !isModelsLoaded ||
    isAnalyzing ||
    !referencePhoto ||
    marathonPhotos.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">detect PoC</h1>
        </header>

        {/* 모델 로딩 상태 */}
        {isLoadingModels && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-blue-700">얼굴 인식 모델 로딩 중...</p>
          </div>
        )}

        {/* 탭 메뉴 */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('matching')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'matching'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📸 얼굴 매칭
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'live'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🎥 실시간 추적
            </button>
          </div>
        </div>

        {/* 탭 내용 */}
        {activeTab === 'matching' ? (
          <>
            {/* 대회 사진 업로드 */}
            <section className="bg-white rounded-lg shadow-md p-6 mb-6">
              <PhotoUploader
                photos={marathonPhotos}
                onPhotosAdd={handleMarathonPhotosAdd}
                onPhotoRemove={handleMarathonPhotoRemove}
              />
            </section>

            {/* 기준 사진 업로드 */}
            <section className="bg-white rounded-lg shadow-md p-6 mb-6">
              <FacePreview
                referencePhoto={referencePhoto}
                onPhotoChange={handleReferencePhotoChange}
              />
            </section>

            {/* 분석 실행 */}
            <section className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-black">
                3. 분석 실행
              </h2>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzeDisabled}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                  isAnalyzeDisabled
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {isAnalyzing
                  ? "분석 중..."
                  : isLoadingModels
                  ? "모델 로딩 중..."
                  : "내 얼굴이 나온 사진 찾기"}
              </button>

              {/* 진행 상태 */}
              {isAnalyzing && analysisProgress.total > 0 && (
                <div className="mt-4">
                  <p className="text-gray-700">
                    사진 분석 중: {analysisProgress.current} /{" "}
                    {analysisProgress.total}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (analysisProgress.current / analysisProgress.total) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 에러 메시지 */}
              {errorMessage && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{errorMessage}</p>
                </div>
              )}
            </section>

            {/* 결과 */}
            <section className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4 text-black">결과</h2>
              <p className="text-gray-600 mb-6 text-black">
                내 얼굴과 유사한 얼굴이 포함된 사진들입니다.
              </p>

              <ResultGallery
                results={matchResults}
                onImageClick={setSelectedImageUrl}
              />
            </section>
          </>
        ) : (
          <>
            {/* 실시간 얼굴 추적 */}
            <section className="bg-white rounded-lg shadow-md p-6">
              <LiveFaceTracker
                isModelsLoaded={isModelsLoaded}
                onCaptureFace={handleCaptureFace}
              />
            </section>
          </>
        )}
      </div>

      {/* 이미지 모달 */}
      <ImageModal
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}
