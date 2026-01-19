
import { Caption } from "../types";

export async function renderVideoWithCaptions(
  videoUrl: string,
  captions: Caption[],
  onProgress: (progress: number) => void,
  signal: AbortSignal,
  dubbedAudio?: Blob | null
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.crossOrigin = 'anonymous';

    await new Promise((res) => (video.onloadedmetadata = res));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject("Canvas context failed");

    const stream = canvas.captureStream(30);
    let combinedStream = stream;

    // Handle Audio Merging
    if (dubbedAudio) {
      const audioCtx = new AudioContext();
      const audioBuffer = await dubbedAudio.arrayBuffer();
      const decodedBuffer = await audioCtx.decodeAudioData(audioBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = decodedBuffer;
      const destination = audioCtx.createMediaStreamDestination();
      source.connect(destination);
      
      const audioTrack = destination.stream.getAudioTracks()[0];
      combinedStream = new MediaStream([...stream.getVideoTracks(), audioTrack]);
      source.start(0);
    }

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: 'video/webm' });
      resolve(finalBlob);
    };

    recorder.start();
    video.play();

    const drawFrame = () => {
      if (signal.aborted) {
        recorder.stop();
        video.pause();
        return reject(new DOMException("Aborted", "AbortError"));
      }

      if (video.ended) {
        recorder.stop();
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Render Captions
      const currentTime = video.currentTime;
      const activeCaption = captions.find(c => currentTime >= c.start && currentTime <= c.end);
      
      if (activeCaption) {
        ctx.font = `${Math.floor(canvas.height / 20)}px Inter, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        
        const text = activeCaption.text;
        const x = canvas.width / 2;
        const y = canvas.height * 0.85;

        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }

      onProgress(video.currentTime / video.duration);
      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  });
}
