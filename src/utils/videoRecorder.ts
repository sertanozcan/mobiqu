export function getSupportedVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidateTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const t of candidateTypes) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

export interface VideoRecorderHandle {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export function startCanvasRecording(
  canvas: HTMLCanvasElement,
  fps = 30
): VideoRecorderHandle | null {
  try {
    const mimeType = getSupportedVideoMimeType();
    if (!mimeType) {
      console.warn('MediaRecorder or WebM/MP4 format is not supported in this browser.');
      return null;
    }

    const stream = canvas.captureStream ? canvas.captureStream(fps) : null;
    if (!stream) {
      console.warn('canvas.captureStream is not available');
      return null;
    }

    const chunks: BlobPart[] = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 3_000_000,
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.start(100);

    let isStopped = false;

    return {
      stop: () => {
        return new Promise<Blob>((resolve, reject) => {
          if (isStopped) {
            resolve(new Blob(chunks, { type: mimeType }));
            return;
          }
          isStopped = true;

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            resolve(blob);
          };

          mediaRecorder.onerror = (err) => {
            reject(err);
          };

          try {
            mediaRecorder.stop();
          } catch (e) {
            reject(e);
          }
        });
      },
      cancel: () => {
        if (!isStopped) {
          isStopped = true;
          try {
            mediaRecorder.stop();
          } catch {
            // ignore
          }
        }
      },
    };
  } catch (err) {
    console.error('Failed to initialize canvas recording:', err);
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
