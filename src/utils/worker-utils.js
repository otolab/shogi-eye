import cv from 'opencv'


export function drawImage(tag, img, conv) {
  const dst = new cv.Mat();
  try {
    img.convertTo(dst, cv.CV_8U)
  }
  catch(err) {
    log('convertTo', err)
  }
  try {
    if (conv) {
      cv.cvtColor(dst, dst, conv)
    }
  }
  catch(err) {
    log('cvtColor', err)
    return
  }
  const {width, height} = img.size()
  const imgData = new ImageData(new Uint8ClampedArray(dst.data, dst.cols, dst.rows), width, height)
  self.postMessage({type: 'drawImage', tag, imageData: imgData}, [imgData.data.buffer]);

  dst.delete()
}


export function log(args) {
  self.postMessage({ type: 'log', args: Array.from(arguments) });
}


