import cv from 'opencv'
import {detectVanishingPoint} from './vanishing-point-detector/index'
import {drawImage, log} from './utils/worker-utils'
import LSD from './libs/lsd';

const CV_PI = Math.PI

cv.onRuntimeInitialized = async () => {
    log('OpenCV runtime initialized');
    init()
};


const _params = {
  hough: {
    threshold: undefined,
    minLineLength: undefined,
    maxLineGap: undefined
  },
  ransac: {
    tryCount: undefined,
    hypothesisThreshold: undefined,
    verificationThreshold: undefined
  },
}


// http://imagingsolution.blog107.fc2.com/blog-entry-137.html
function calcCrossPoint(P1, P3, P2, P4) {
  const C = [];
  const S1 = ((P4.x - P2.x) * (P1.y - P2.y) - (P4.y - P2.y) * (P1.x - P2.x)) / 2
  const S2 = ((P4.x - P2.x) * (P2.y - P3.y) - (P4.y - P2.y) * (P2.x - P3.x)) / 2
  C[0] = P1.x + (P3.x - P1.x) * S1 / (S1 + S2)
  C[1] = P1.y + (P3.y - P1.y) * S1 / (S1 + S2)
  return C;
}


function reversePerspective(imageData, vanishingPointH, vanishingPointV) {
  const img = cv.matFromImageData(imageData)
  const dst = new cv.Mat()

  const dstPoints = []
  const srcPoints = []

  const {width, height} = imageData
  const p = []

  if( vanishingPointV.y < height/2 ){
    p[0] = {x: 0, y: height}
    p[1] = {x: width, y: height}
  }
  else{
    p[0] = {x: 0, y: 0}
    p[1] = {x: width, y: 0}
  }
  if( vanishingPointH.x < width/2 ){
    p[2] = {x: width, y: 0};
    p[3] = {x: width, y: height};
  }
  else{
    p[2] = {x: 0, y: 0}
    p[3] = {x: 0, y: height};
  }

  if( vanishingPointV.y > height/2 ){
    p[0] = {x: 0, y: height}
    p[1] = {x: width, y: height}
  }
  else{
    p[0] = {x: 0, y: 0}
    p[1] = {x: width, y: 0}
  }
  if( vanishingPointH.x > width/2 ){
    p[2] = {x: width, y: 0}
    p[3] = {x: width, y: height}
  }
  else{
    p[2] = {x: 0, y: 0}
    p[3] = {x: 0, y: height}
  }

  srcPoints[0] = calcCrossPoint( vanishingPointV, p[0], vanishingPointH, p[2] );
  srcPoints[1] = calcCrossPoint( vanishingPointV, p[1], vanishingPointH, p[2] );
  srcPoints[2] = calcCrossPoint( vanishingPointV, p[0], vanishingPointH, p[3] );
  srcPoints[3] = calcCrossPoint( vanishingPointV, p[1], vanishingPointH, p[3] );

  dstPoints[0] = [0, 0];
  dstPoints[1] = [width, 0];
  dstPoints[2] = [0, height];
  dstPoints[3] = [width, height];

  if (vanishingPointH.x && vanishingPointV.x) {
    const fromRect = cv.matFromArray(4, 2, cv.CV_32F, srcPoints.flat())
    const toRect = cv.matFromArray(4, 2, cv.CV_32F, dstPoints.flat())

    const transform = cv.getPerspectiveTransform(fromRect, toRect)
    cv.warpPerspective(img, dst, transform, img.size(), 0)

    drawImage('reversePerspectived', dst, null)

    fromRect.delete()
    toRect.delete()
    dst.delete()
  }

  img.delete()

  return {
    perspectiveRect: srcPoints
  }
}


async function init() {
  self.cv = cv

  self.postMessage({ type: 'init' });

  self.addEventListener('message', ({ data }) => {
    if (data.type === 'frame') {
      // const lines = detectLines(data.imageData, _params.hough)
      const lines = detectLinesLSD(data.imageData)

      const {
        holizonalLines,
        verticalLines,
        probLineH,
        ransacLineH,
        probLineV,
        ransacLineV,
        vanishingPointH,
        vanishingPointV
      } = detectVanishingPoint(lines, _params.ransac)

      const {
        perspectiveRect
      } = reversePerspective(data.imageData, vanishingPointH, vanishingPointV)

      self.postMessage({
        type: 'detect',
        lines,
        holizonalLines,
        verticalLines,
        probLineH,
        ransacLineH,
        vanishingPointH,
        probLineV,
        ransacLineV,
        vanishingPointV,
        perspectiveRect
      })
      self.postMessage({ type: 'request' });
    }
    if (data.type == 'params') {
      Object.assign(_params, data.params)
    }
  });

  self.postMessage({ type: 'request' });
}


function detectLinesLSD(imageData) {
  const detector = new LSD(0, 0.8);
  detector.angles = new Float64Array()
  const lines = detector.detect(imageData);

  const img = cv.matFromImageData(imageData)
  const imgGray = new cv.Mat()
  const imgCanny = new cv.Mat()
  cv.cvtColor(img, imgGray, cv.COLOR_RGBA2GRAY, 0)
  cv.Canny(imgGray, imgCanny, 50, 150)

  drawImage('canny', imgCanny, cv.COLOR_GRAY2RGBA)
  drawImage('canny2', imgCanny, cv.COLOR_GRAY2RGBA)

  img.delete()
  imgGray.delete()
  imgCanny.delete()

  return lines.map((v) => {
    if (v.x1 < v.x2) {
      return [v.x1, v.y1, v.x2, v.y2]
    }
    else {
      return [v.x2, v.y2, v.x1, v.y1]
    }
  })

}


function detectLines(imageData, params={}) {
  const {
    threshold = imageData.width / 5,
    minLineLength = imageData.width / 5,
    maxLineGap = imageData.width / 20
  } = params

  const img = cv.matFromImageData(imageData)
  const imgGray = new cv.Mat()
  const imgCanny = new cv.Mat()
  cv.cvtColor(img, imgGray, cv.COLOR_RGBA2GRAY, 0)

  const detected = []
  const lines = new cv.Mat()

  cv.Canny(imgGray, imgCanny, 50, 150)
  cv.HoughLinesP(imgCanny, lines, 1, CV_PI/180, threshold, minLineLength, maxLineGap)

  for (let i = 0; i < lines.size().height; i++) {
    detected.push(lines.row(i).data32S)
  }

  drawImage('canny', imgCanny, cv.COLOR_GRAY2RGBA)
  drawImage('canny2', imgCanny, cv.COLOR_GRAY2RGBA)

  img.delete()
  imgGray.delete()
  imgCanny.delete()
  lines.delete()

  return detected;
}

