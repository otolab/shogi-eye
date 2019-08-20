import cv from 'opencv'
import {drawImage, log} from '../utils/worker-utils'

let classifier = null;


async function createFileFromUrl(path, url) {
    // Small function to make a remote file visible from emscripten module.

    log(`⬇️ Downloading additional file from ${url}.`);
    const res = await self.fetch(url);
    if (!res.ok) {
        throw new Error(`Response is not OK (${res.status} ${res.statusText} for ${url})`);
    }
    const buffer = await res.arrayBuffer();
    const data = new Uint8Array(buffer);
    cv.FS_createDataFile('/', path, data, true, true, false);
    log(`📦${url} downloaded. Mounted on /${path}`);
}

export async function init() {
    await createFileFromUrl('haarcascade_frontalface_default.xml',
                            '/static/data/haarcascade_frontalface_default.xml');

    classifier = new cv.CascadeClassifier();
    classifier.load('haarcascade_frontalface_default.xml');
}


export function detectFaces(imageData) {
  const img = cv.matFromImageData(imageData);
  const imgGray = new cv.Mat();

  const rect = [];
  cv.cvtColor(img, imgGray, cv.COLOR_RGBA2GRAY, 0);
  const faces = new cv.RectVector();
  const msize = new cv.Size(0, 0);
  classifier.detectMultiScale(imgGray, faces, 1.1, 3, 0, msize, msize);

  for (let i = 0; i < faces.size(); i++) {
    rect.push(faces.get(i));
  }

  drawImage('gray', imgGray, cv.COLOR_GRAY2RGBA)

  img.delete();
  faces.delete();
  imgGray.delete();

  return rect;
}

