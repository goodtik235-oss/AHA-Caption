
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Languages, Download, Wand2, Loader2, AlertTriangle, Film, LogOut, Mic, Square, Volume2 } from 'lucide-react';
import { onAuthStateChanged, signOut, auth } from './services/firebase';
import Auth from './components/Auth';
import VideoPlayer from './components/VideoPlayer';
import CaptionEditor from './components/CaptionEditor';
import StatsChart from './components/StatsChart';
import { Caption, ProcessingStatus, SUPPORTED_LANGUAGES } from './types';
import { extractAudioFromVideo, base64ToWavBlob } from './services/audioUtils';
import { transcribeAudio, translateCaptions, generateSpeech, fixCaptions } from './services/geminiService';
import { renderVideoWithCaptions } from './services/videoRenderer';

function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Logic State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [selectedLang, setSelectedLang] = useState<string>('ur-PK');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderingProgress, setRenderingProgress] = useState(0);
  const [dubbedAudioBlob, setDubbedAudioBlob] = useState<Blob | null>(null);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [useDubbing, setUseDubbing] = useState(false);
  const [isDubPreviewPlaying, setIsDubPreviewPlaying] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processAbortControllerRef = useRef<AbortController | null>(null);
  const dubPreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (dubbedAudioUrl) URL.revokeObjectURL(dubbedAudioUrl);
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
  }, [dubbedAudioUrl, videoSrc]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setVideoSrc(null);
      setVideoFile(null);
      setCaptions([]);
      setStatus(ProcessingStatus.IDLE);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoFile(file);
      setCaptions([]);
      setStatus(ProcessingStatus.IDLE);
      setErrorMsg(null);
      setRenderingProgress(0);
      setDubbedAudioBlob(null);
      setDubbedAudioUrl(null);
      setUseDubbing(false);
    }
  };

  const handleStopProcessing = () => {
    if (processAbortControllerRef.current) {
      processAbortControllerRef.current.abort();
      processAbortControllerRef.current = null;
    }
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg("Process aborted by user.");
  };

  const handleGenerateCaptions = async () => {
    if (!videoFile) return;
    if (processAbortControllerRef.current) processAbortControllerRef.current.abort();
    const controller = new AbortController();
    processAbortControllerRef.current = controller;

    try {
      setErrorMsg(null);
      setStatus(ProcessingStatus.EXTRACTING_AUDIO);
      const audioBase64 = await extractAudioFromVideo(videoFile);
      if (controller.signal.aborted) return;
      
      setStatus(ProcessingStatus.TRANSCRIBING);
      const generatedCaptions = await transcribeAudio(audioBase64, controller.signal);
      if (controller.signal.aborted) return;
      
      setCaptions(generatedCaptions);
      setStatus(ProcessingStatus.COMPLETED);
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      setStatus(ProcessingStatus.ERROR);
      setErrorMsg(err.message || "An unknown error occurred.");
    }
  };

  const handleMagicFix = async () => {
    if (captions.length === 0) return;
    const controller = new AbortController();
    processAbortControllerRef.current = controller;
    
    try {
      setStatus(ProcessingStatus.TRANSCRIBING); // Re-use for generic processing state
      const fixed = await fixCaptions(captions, controller.signal);
      if (controller.signal.aborted) return;
      setCaptions(fixed);
      setStatus(ProcessingStatus.COMPLETED);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setStatus(ProcessingStatus.ERROR);
      setErrorMsg("Failed to apply Magic Fix.");
    }
  };

  const handleTranslate = async () => {
    if (captions.length === 0) return;
    if (processAbortControllerRef.current) processAbortControllerRef.current.abort();
    const controller = new AbortController();
    processAbortControllerRef.current = controller;

    try {
      setStatus(ProcessingStatus.TRANSLATING);
      const translated = await translateCaptions(
          captions, 
          SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name || "English",
          controller.signal
      );
      if (controller.signal.aborted) return;
      
      setCaptions(translated);
      setDubbedAudioBlob(null);
      setDubbedAudioUrl(null);
      setUseDubbing(false);
      setStatus(ProcessingStatus.COMPLETED);
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      setStatus(ProcessingStatus.ERROR);
      setErrorMsg("Translation failed.");
    }
  };

  const handleDubbing = async () => {
    if (captions.length === 0) return;
    if (processAbortControllerRef.current) processAbortControllerRef.current.abort();
    const controller = new AbortController();
    processAbortControllerRef.current = controller;

    try {
      setStatus(ProcessingStatus.GENERATING_SPEECH);
      setErrorMsg(null);
      
      const fullText = captions.map(c => c.text).join('. ');
      const audioBase64 = await generateSpeech(fullText, controller.signal);
      if (controller.signal.aborted) return;
      
      const blob = base64ToWavBlob(audioBase64, 24000);
      const url = URL.createObjectURL(blob);

      setDubbedAudioBlob(blob);
      setDubbedAudioUrl(url);
      setUseDubbing(true);
      setStatus(ProcessingStatus.COMPLETED);
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      setStatus(ProcessingStatus.ERROR);
      setErrorMsg("Dubbing failed: " + err.message);
    }
  };

  const toggleDubPreview = () => {
    if (!dubPreviewAudioRef.current) return;
    
    if (isDubPreviewPlaying) {
      dubPreviewAudioRef.current.pause();
      setIsDubPreviewPlaying(false);
    } else {
      dubPreviewAudioRef.current.currentTime = 0;
      dubPreviewAudioRef.current.play();
      setIsDubPreviewPlaying(true);
    }
  };

  const handleDownloadSRT = () => {
    let srtContent = "";
    captions.forEach((cap, index) => {
      const start = formatSRTTime(cap.start);
      const end = formatSRTTime(cap.end);
      srtContent += `${index + 1}\n${start} --> ${end}\n${cap.text}\n\n`;
    });
    const blob = new Blob([srtContent], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "captions.srt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportVideo = async () => {
    if (!videoSrc || captions.length === 0) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setStatus(ProcessingStatus.RENDERING);
      setRenderingProgress(0);
      const audioToUse = useDubbing ? dubbedAudioBlob : null;
      const blob = await renderVideoWithCaptions(
        videoSrc, 
        captions, 
        (progress) => setRenderingProgress(progress),
        controller.signal,
        audioToUse
      );
      const isMp4 = blob.type.includes('mp4');
      const extension = isMp4 ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `captioned_video${useDubbing ? '_dubbed' : ''}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus(ProcessingStatus.COMPLETED);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus(ProcessingStatus.IDLE);
      } else {
        setStatus(ProcessingStatus.ERROR);
        setErrorMsg("Render error: " + err.message);
      }
    } finally {
      setRenderingProgress(0);
      abortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  const updateCaption = (id: string, newText: string) => {
    setCaptions(prev => prev.map(c => c.id === id ? { ...c, text: newText } : c));
  };

  const formatSRTTime = (seconds: number) => {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    return date.toISOString().substr(11, 12).replace('.', ',');
  };

  const isProcessing = status === ProcessingStatus.EXTRACTING_AUDIO || 
                       status === ProcessingStatus.TRANSCRIBING || 
                       status === ProcessingStatus.TRANSLATING ||
                       status === ProcessingStatus.GENERATING_SPEECH;
  const isRendering = status === ProcessingStatus.RENDERING;
  const isTranscribing = status === ProcessingStatus.EXTRACTING_AUDIO || status === ProcessingStatus.TRANSCRIBING;
  const isTranslating = status === ProcessingStatus.TRANSLATING;
  const isDubbing = status === ProcessingStatus.GENERATING_SPEECH;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col overflow-hidden relative">
      
      {/* Hidden Audio element for export preview */}
      {dubbedAudioUrl && (
        <audio 
          ref={dubPreviewAudioRef} 
          src={dubbedAudioUrl} 
          onEnded={() => setIsDubPreviewPlaying(false)}
          className="hidden"
        />
      )}

      {/* Universal Modal Processing Overlay */}
      {(isRendering || isProcessing) && (
        <div className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-8 transition-all animate-in fade-in duration-300">
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse"></div>
              <Loader2 className="w-24 h-24 text-indigo-500 animate-spin relative" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                {isRendering ? 'Exporting Masterpiece' : 'Processing Content'}
            </h2>
            <p className="text-slate-400 mb-10 text-center max-w-md text-lg">
                {status === ProcessingStatus.EXTRACTING_AUDIO && 'Optimizing audio spectrum...'}
                {status === ProcessingStatus.TRANSCRIBING && 'AHA is analyzing your content...'}
                {status === ProcessingStatus.TRANSLATING && 'Adapting to local culture...'}
                {status === ProcessingStatus.GENERATING_SPEECH && 'Synthesizing voiceover...'}
                {status === ProcessingStatus.RENDERING && `Rendering: ${Math.round(renderingProgress * 100)}%`}
            </p>
            
            {isRendering && (
                <div className="w-full max-w-lg bg-slate-800 rounded-full h-2 mb-12 overflow-hidden shadow-inner">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    style={{ width: `${renderingProgress * 100}%` }}
                  />
                </div>
            )}

            <button
              onClick={isRendering ? handleCancelExport : handleStopProcessing}
              className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold transition-all flex items-center shadow-xl shadow-red-900/40 hover:scale-105 active:scale-95"
            >
              <Square size={20} className="mr-3 fill-current" />
              Stop Processing
            </button>
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-bold text-lg">A</span>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            AHA Studio
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center text-xs text-slate-500 mr-2 uppercase tracking-widest font-semibold bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-700">
            {user.email}
          </div>

          <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700" title="Sign Out">
             <LogOut size={18} />
          </button>

          <input type="file" ref={videoInputRef} accept="video/*" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => videoInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg text-sm font-medium transition-all border border-indigo-500/20">
            <Upload size={16} />
            <span>{videoFile ? 'Change Video' : 'Upload Video'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="w-full max-w-5xl mx-auto relative">
             <VideoPlayer src={videoSrc} captions={captions} onTimeUpdate={setCurrentTime} />

             <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Transcribe */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
                  <div className="mb-3">
                    <h3 className="font-semibold text-slate-200 flex items-center">
                      <Wand2 size={16} className="mr-2 text-indigo-400"/> Transcribe
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 text-balance">High-accuracy voice-to-text conversion.</p>
                  </div>
                  <button
                    onClick={isTranscribing ? handleStopProcessing : handleGenerateCaptions}
                    disabled={!videoFile || (isProcessing && !isTranscribing) || isRendering}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${
                      !videoFile 
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : isTranscribing
                          ? 'bg-red-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                    }`}
                  >
                     {isTranscribing ? 'Stop' : 'Analyze'}
                  </button>
                </div>

                {/* 2. Translate */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
                  <div className="mb-3">
                    <h3 className="font-semibold text-slate-200 flex items-center">
                      <Languages size={16} className="mr-2 text-purple-400"/> Translate
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">Cross-lingual adaptation.</p>
                  </div>
                  <div className="flex space-x-2">
                    <select
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      disabled={isRendering || isProcessing}
                      className="bg-slate-800 border border-slate-700 text-sm rounded-xl px-2 py-2 outline-none focus:border-indigo-500 flex-1 min-w-0"
                    >
                      {SUPPORTED_LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={isTranslating ? handleStopProcessing : handleTranslate}
                      disabled={captions.length === 0 || (isProcessing && !isTranslating) || isRendering}
                      className={`text-white p-2.5 rounded-xl transition-all flex items-center justify-center ${
                          isTranslating 
                            ? 'bg-red-600 hover:bg-red-500 w-12' 
                            : 'bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600'
                      }`}
                    >
                      {isTranslating ? <Square className="fill-current" size={14}/> : <Languages size={20} />}
                    </button>
                  </div>
                </div>

                {/* 3. Dubbing */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
                   <div className="mb-3">
                    <h3 className="font-semibold text-slate-200 flex items-center">
                      <Mic size={16} className="mr-2 text-pink-400"/> AI Dubbing
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">Natural localized speech synthesis.</p>
                  </div>
                  <button
                    onClick={isDubbing ? handleStopProcessing : handleDubbing}
                    disabled={captions.length === 0 || (isProcessing && !isDubbing) || isRendering}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${
                        isDubbing
                          ? 'bg-red-600 text-white'
                          : 'bg-pink-600 hover:bg-pink-500 text-white disabled:bg-slate-800'
                    }`}
                  >
                    {isDubbing ? 'Stop' : 'Dub Audio'}
                  </button>
                </div>

                {/* 4. Export */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
                   <div className="mb-3">
                    <h3 className="font-semibold text-slate-200 flex items-center">
                      <Download size={16} className="mr-2 text-emerald-400"/> Export
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="dubCheck" 
                          checked={useDubbing} 
                          onChange={(e) => setUseDubbing(e.target.checked)}
                          disabled={!dubbedAudioBlob || isProcessing || isRendering}
                          className="w-3 h-3 rounded bg-slate-800 border-slate-700 text-emerald-500"
                        />
                        <label htmlFor="dubCheck" className={`text-[10px] select-none cursor-pointer ${dubbedAudioBlob ? 'text-slate-300' : 'text-slate-600'}`}>Include Dub</label>
                      </div>
                      
                      {dubbedAudioUrl && (
                        <button
                          onClick={toggleDubPreview}
                          className={`p-1 rounded-full transition-all ${isDubPreviewPlaying ? 'bg-pink-500/20 text-pink-400' : 'bg-slate-800 text-slate-400 hover:text-pink-400'}`}
                          title={isDubPreviewPlaying ? "Stop Listening" : "Listen to Dub"}
                        >
                          {isDubPreviewPlaying ? <Square size={12} className="fill-current" /> : <Volume2 size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                        onClick={handleDownloadSRT}
                        disabled={captions.length === 0 || isRendering || isProcessing}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs border border-slate-700 disabled:text-slate-600"
                    >
                        .SRT
                    </button>
                    <button
                        onClick={handleExportVideo}
                        disabled={captions.length === 0 || isRendering || isProcessing}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center disabled:bg-slate-800 disabled:text-slate-600"
                    >
                        <Film size={14} className="mr-1"/>
                        Video
                    </button>
                  </div>
                </div>

             </div>

             {errorMsg && (
               <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start text-sm shadow-sm animate-in fade-in">
                 <AlertTriangle size={18} className="mr-3 mt-0.5 flex-shrink-0" />
                 <div>
                   <p className="font-bold">Execution Error</p>
                   <p className="opacity-80">{errorMsg}</p>
                 </div>
               </div>
             )}

             <StatsChart captions={captions} />
          </div>
        </div>

        <div className="w-80 md:w-96 flex-shrink-0 bg-slate-950 border-l border-slate-800/50">
           <CaptionEditor 
             captions={captions} 
             currentTime={currentTime} 
             onUpdateCaption={updateCaption}
             onMagicFix={handleMagicFix}
             isProcessing={isProcessing}
             onSeek={(t) => {
                const video = document.querySelector('video');
                if (video) video.currentTime = t;
             }}
           />
        </div>

      </main>
    </div>
  );
}

export default App;
