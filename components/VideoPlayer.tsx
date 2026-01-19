
import React, { useRef, useEffect, useState } from 'react';
import { Caption } from '../types';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

interface VideoPlayerProps {
  src: string | null;
  captions: Caption[];
  onTimeUpdate: (time: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, captions, onTimeUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => onTimeUpdate(video.currentTime);
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    // Sync initial volume
    video.volume = volume;
    video.muted = isMuted;

    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate]);

  // Sync volume changes to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const toggleMute = () => setIsMuted(!isMuted);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
    else setIsMuted(true);
  };

  const activeCaption = captions.find(
    (c) => videoRef.current && videoRef.current.currentTime >= c.start && videoRef.current.currentTime <= c.end
  );

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

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
          
          {/* Custom Volume Control Overlay */}
          <div className="absolute top-4 right-4 z-10 flex items-center space-x-2 bg-slate-900/60 backdrop-blur-md border border-white/10 p-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button 
              onClick={toggleMute}
              className="p-1.5 text-white hover:text-indigo-400 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              <VolumeIcon size={18} />
            </button>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
              style={{
                background: `linear-gradient(to right, #6366f1 ${ (isMuted ? 0 : volume) * 100}%, #334155 ${ (isMuted ? 0 : volume) * 100}%)`
              }}
            />
          </div>

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
