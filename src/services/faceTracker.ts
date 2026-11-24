/**
 * Finds the patient's face in the camera image, on the device: the small "tiny face detector"
 * model (190 KB, bundled with the app) runs in the browser; nothing is recorded or sent anywhere.
 * The library is loaded only when a face game opens, so the rest of NEXO stays light.
 */
import manifest from '../assets/models/tiny_face_detector_model-weights_manifest.json';
import modelUrl from '../assets/models/tiny_face_detector_model.bin?url';

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

let tracker: Promise<FaceTracker | null> | null = null;

export function loadFaceTracker(): Promise<FaceTracker | null> {
  if (!tracker) {
    tracker = (async () => {
      try {
        const faceapi = await import('@vladmandic/face-api');
        // The weights travel inside the app (an asset, or inlined in the single-file preview),
        // so the model works offline and wherever the app is opened.
        const bin = await (await fetch(modelUrl)).arrayBuffer();
        const weights = faceapi.tf.io.decodeWeights(bin, manifest[0].weights as Parameters<typeof faceapi.tf.io.decodeWeights>[1]);
        faceapi.nets.tinyFaceDetector.loadFromWeightMap(weights);
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
        tracker = null; // allow a later retry
        return null;
      }
    })();
  }
  return tracker;
}
