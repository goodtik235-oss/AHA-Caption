
import React, { useEffect, useRef } from 'react';
import { Caption } from '../types';
import { Edit2, Play, Clock, Sparkles } from 'lucide-react';

interface CaptionEditorProps {
  captions: Caption[];
  currentTime: number;
  onUpdateCaption: (id: string, text: string) => void;
  onSeek: (time: number) => void;
  onMagicFix: () => void;
  isProcessing: boolean;
}

const CaptionEditor: React.FC<CaptionEditorProps> = ({ 
  captions, 
  currentTime, 
  onUpdateCaption, 
  onSeek, 
  onMagicFix,
  isProcessing 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeIndex = captions.findIndex(c => currentTime >= c.start && currentTime <= c.end);
    if (activeIndex !== -1 && scrollRef.current) {
      const element = scrollRef.current.children[activeIndex] as HTMLElement;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, captions]);

  return (
    <div className="h-full flex flex-col bg-slate-900/30 backdrop-blur-sm">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center text-white">
            <Edit2 size={18} className="mr-3 text-indigo-400" />
            Edit Captions
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">{captions.length} Segments</p>
        </div>
        
        {captions.length > 0 && (
          <button
            onClick={onMagicFix}
            disabled={isProcessing}
            title="AI Proofread & Fix"
            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all border border-indigo-500/20 active:scale-95 disabled:opacity-50 group"
          >
            <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {captions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center px-4 space-y-4">
             <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center">
                <Edit2 size={24} className="opacity-20" />
             </div>
             <p className="text-sm">Captions will appear here after transcription.</p>
          </div>
        ) : (
          captions.map((cap) => {
            const isActive = currentTime >= cap.start && currentTime <= cap.end;
            return (
              <div 
                key={cap.id}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                  isActive 
                    ? 'bg-indigo-600/15 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30' 
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => onSeek(cap.start)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
                    <Clock size={10} />
                    <span>{cap.start.toFixed(2)}s - {cap.end.toFixed(2)}s</span>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  )}
                  <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity">
                    <Play size={12} fill="currentColor" />
                  </button>
                </div>
                <textarea
                  className="w-full bg-transparent text-sm text-slate-200 focus:outline-none resize-none placeholder-slate-600 leading-relaxed"
                  value={cap.text}
                  onChange={(e) => onUpdateCaption(cap.id, e.target.value)}
                  rows={2}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CaptionEditor;
