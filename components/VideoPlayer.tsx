
import React, { useRef, useEffect } from 'react';
import { Caption } from '../types';

interface VideoPlayerProps {
  src: string | null;
  captions: Caption[];
  onTimeUpdate: (time: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, captions, onTimeUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => onTimeUpdate(video.currentTime);
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate]);

  const activeCaption = captions.find(
    (c) => videoRef.current && videoRef.current.currentTime >= c.start && videoRef.current.currentTime <= c.end
  );

  return (
    <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl group border border-slate-800">
      {src ? (
        <>
          <video 
            ref={videoRef}
            src={src} 
            className="w-full h-full object-contain" 
            controls 
          />
          {activeCaption && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center px-8 pointer-events-none">
              <span className="bg-black/70 backdrop-blur-md text-white px-6 py-2 rounded-xl text-lg md:text-2xl font-medium text-center shadow-lg border border-white/10">
                {activeCaption.text}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 group-hover:scale-110 transition-transform">
             <span className="text-4xl">🎬</span>
          </div>
          <p className="text-lg font-medium">Upload a video to start the magic</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
