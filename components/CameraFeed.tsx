
import React, { useEffect, useRef } from 'react';

interface CameraFeedProps {
  stream: MediaStream | null;
  label: string;
  error: string | null;
  isLoading: boolean;
  isMirrored?: boolean;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ 
  stream, 
  label, 
  error, 
  isLoading, 
  isMirrored = false 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-container group">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-6 text-center">
          <i className="fas fa-video-slash text-4xl mb-3 text-red-500"></i>
          <p className="font-medium text-sm">{error}</p>
        </div>
      ) : stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`video-feed ${isMirrored ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
          <i className="fas fa-camera text-4xl mb-3"></i>
          <p className="text-xs font-semibold tracking-widest uppercase">Inactive</p>
        </div>
      )}
      
      <div className="camera-label">
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
        {label}
      </div>

      {stream && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex space-x-2">
            <button className="bg-black/40 hover:bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10 text-white">
              <i className="fas fa-expand"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
