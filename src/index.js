
import DetectFaceWorker from 'web-worker:./worker'
import ShogiEyeApp from './components/app.vue'
import deviceStore from './deviceStore'

import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(ElementUI)

// const PROCESSING_RESOLUTION_WIDTH = 120;
const PROCESSING_RESOLUTION_WIDTH = 240;

let worker = null;
let app = null


function log(...args) {
  console.log(...args);
}

function initWorker() {
  log('initWorker');

  worker = new DetectFaceWorker()
  worker.addEventListener('message', ({ data }) => {
    switch (data.type) {
      case 'request':
        detect()
        break;
      case 'init':
        log('initialized');
        break;
      case 'detect':
        app.drawLines('canny', data.lines)
        app.drawPoints('holizonal', data.holizonalLines)
        app.drawPoints('vertical', data.verticalLines)
        app.drawLines('holizonal', [data.probLineH, data.ransacLineH])
        app.drawLines('vertical', [data.probLineV, data.ransacLineV])

        let lines = [
          [data.perspectiveRect[0][0], data.perspectiveRect[0][1], data.perspectiveRect[1][0], data.perspectiveRect[1][1]],
          [data.perspectiveRect[1][0], data.perspectiveRect[1][1], data.perspectiveRect[3][0], data.perspectiveRect[3][1]],
          [data.perspectiveRect[3][0], data.perspectiveRect[3][1], data.perspectiveRect[2][0], data.perspectiveRect[2][1]],
          [data.perspectiveRect[2][0], data.perspectiveRect[2][1], data.perspectiveRect[0][0], data.perspectiveRect[0][1]]
        ]
        app.drawLines('canny2', lines)

        app.updateFps()
        break;
      case 'drawImage':
        const {tag, imageData} = data
        app.showImage(tag, imageData)
        break;
      case 'log':
        log(...data.args);
        break;
    }
  });
}


async function detect() {
  const imageData = app.getImageData(PROCESSING_RESOLUTION_WIDTH)

  if (!imageData) {
    setTimeout(detect, 100)
    return
  }

  worker.postMessage({ type: 'frame', imageData }, [ imageData.data.buffer ]);
}


async function init() {
  await deviceStore.init()

  app = new Vue(ShogiEyeApp)
  app.$mount('#app')

  initWorker();
}


init();
