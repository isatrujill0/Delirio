/**
 * Finds the patient's face in the camera image, on the device: the small "tiny face detector"
 * model (190 KB) and the 68-point face model (77 KB), both bundled with the app, run in the browser;
 * nothing is recorded or sent anywhere.
 * The library is loaded only when a face game opens, so the rest of SYNK stays light.
 */
import manifest from '../assets/models/tiny_face_detector_model-weights_manifest.json';
import modelUrl from '../assets/models/tiny_face_detector_model.bin?url';
import landmarksManifest from '../assets/models/face_landmark_68_tiny_model-weights_manifest.json';
import landmarksUrl from '../assets/models/face_landmark_68_tiny_model.bin?url';

export interface FacePosition {
  /** Face centre, 0–1 across and down the camera image. */
  x: number;
  y: number;
  /** Face height relative to the image (closer to the camera = bigger). */
  size: number;
  /** Face box, 0–1 relative to the image. */
  box: { x: number; y: number; w: number; h: number };
  /** The 68 face points (jaw, eyebrows, eyes, nose, mouth), 0–1 relative to the image. */
  points: { x: number; y: number }[];
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
        type Specs = Parameters<typeof faceapi.tf.io.decodeWeights>[1];
        const [bin, lmBin] = await Promise.all([fetch(modelUrl), fetch(landmarksUrl)].map(async (r) => (await r).arrayBuffer()));
        faceapi.nets.tinyFaceDetector.loadFromWeightMap(faceapi.tf.io.decodeWeights(bin, manifest[0].weights as Specs));
        faceapi.nets.faceLandmark68TinyNet.loadFromWeightMap(faceapi.tf.io.decodeWeights(lmBin, landmarksManifest[0].weights as Specs));
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
        return {
          async detect(video) {
            if (!video.videoWidth) return null;
            const found = await faceapi.detectSingleFace(video, options).withFaceLandmarks(true);
            if (!found) return null;
            const W = video.videoWidth;
            const H = video.videoHeight;
            const b = found.detection.box;
            return {
              x: (b.x + b.width / 2) / W,
              y: (b.y + b.height / 2) / H,
              size: b.height / H,
              box: { x: b.x / W, y: b.y / H, w: b.width / W, h: b.height / H },
              points: found.landmarks.positions.map((p) => ({ x: p.x / W, y: p.y / H })),
            };
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
