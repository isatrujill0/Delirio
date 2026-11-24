/**
 * Finds the patient's face in the camera image, on the device: the small "tiny face detector"
 * model (190 KB, in public/models) runs in the browser; nothing is recorded or sent anywhere.
 * The library is loaded only when a face game opens, so the rest of NEXO stays light.
 */

export interface FacePosition {
  /** Face centre, 0–1 across and down the camera image. */
  x: number;
  y: number;
  /** Face height relative to the image (closer to the camera = bigger). */
  size: number;
}

export interface FaceTracker {
  detect(video: HTMLVideoElement): Promise<FacePosition | null>;
}

// The Claude preview build cannot use the camera, so it does not carry the library at all.
const loadLibrary = import.meta.env.MODE === 'artifact' ? null : () => import('@vladmandic/face-api');

let tracker: Promise<FaceTracker | null> | null = null;

export function loadFaceTracker(): Promise<FaceTracker | null> {
  if (!tracker) {
    tracker = (async () => {
      if (!loadLibrary) return null;
      try {
        const faceapi = await loadLibrary();
        await faceapi.nets.tinyFaceDetector.loadFromUri(new URL('./models', document.baseURI).href);
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
        return {
          async detect(video) {
            if (!video.videoWidth) return null;
            const found = await faceapi.detectSingleFace(video, options);
            if (!found) return null;
            const b = found.box;
            return { x: (b.x + b.width / 2) / video.videoWidth, y: (b.y + b.height / 2) / video.videoHeight, size: b.height / video.videoHeight };
          },
        };
      } catch {
        tracker = null; // allow a later retry (e.g. it was offline the first time)
        return null;
      }
    })();
  }
  return tracker;
}
