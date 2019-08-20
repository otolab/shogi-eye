<template>

  <div>  
    <el-header>: container for headers. </el-header>

    <el-container>
      <el-aside>

        <el-form>
          <label>device</label>

          <el-select v-model="selectedDeviceId" placeholder="select...">
            <el-option v-for="device in devices" :label="device.label || device.deviceId || 'no-name'" :value="device.deviceId"></el-option>
          </el-select>

          <el-form-item label="threshold">
            <el-input-number type="number" v-model="params.hough.threshold"></el-input-number>
          </el-form-item>

          <el-form-item label="minLineLength">
            <el-input-number type="number" v-model="params.hough.minLineLength"></el-input-number>
          </el-form-item>

          <el-form-item label="maxLineGap">
            <el-input-number type="number" v-model="params.hough.maxLineGap"></el-input-number>
          </el-form-item>

          <el-form-item label="tryCount">
            <el-input-number type="number" v-model="params.ransac.tryCount"></el-input-number>
          </el-form-item>

          <el-form-item label="hypothesisThreshold">
            <el-input-number type="number" v-model="params.ransac.hypothesisThreshold"></el-input-number>
          </el-form-item>

          <el-form-item label="verificationThreshold">
            <el-input-number type="number" v-model="params.ransac.verificationThreshold"></el-input-number>
          </el-form-item>
        </el-form>

      </el-aside>

      <el-main>
        <div class="videoWrapper" id="videoWrapper">
          <div class="fps" id="fps"></div>

          <camera-preview ref='preview' :selected-device-id="selectedDeviceId"></camera-preview>

        </div>
      </el-main>
    </el-container>

    <el-container>

      <el-header>: container for headers. </el-header>

      <el-main>

        <el-row :gutter="12">

          <el-col :span="8">
            <el-card :body-style="{padding:'0px'}"><canvas id="canny"></canvas></el-card>
          </el-col>

          <el-col :span="8">
            <el-card :body-style="{padding:'0px'}"><canvas id="canny2"></canvas></el-card>
          </el-col>

          <el-col :span="8">
            <el-card :body-style="{padding:'0px'}"><canvas id="holizonal" width="500" height="500"></canvas></el-card>
          </el-col>

          <el-col :span="8">
            <el-card :body-style="{padding:'0px'}"><canvas id="vertical" width="500" height="500"></canvas></el-card>
          </el-col>

          <el-col :span="8">
            <el-card :body-style="{padding:'0px'}"><canvas id="reversePerspectived"></canvas></el-card>
          </el-col>

        </el-row>

      </el-main>
    </el-container>

    <div class="log" id="log"></div>

  </div>

</template>


<script>
  import deviceStore from '../deviceStore'
  import CameraPreview from './camera-preview.vue'

  export default {
    components: {
      CameraPreview
    },
    data() {
      return {
        deviceStoreState: deviceStore.state,
        selectedDeviceId: null,

        params: {
          hough: {
            threshold: 50,
            minLineLength: 50,
            maxLineGap: 10
          },
          ransac: {
            tryCount: 100,
            hypothesisThreshold: 10,
            verificationThreshold: 30
          }
        },

        images: {},
        lines: {},
        points: {}
      }
    },
    computed: {
      devices() {
        return this.deviceStoreState.devices
      },
    },
    watch: {
      params: {
        deep: true,
        handler(params) {
          window.worker.postMessage({type: 'params', params});
        }
      }
    },
    methods: {
      getImageData(width) {
        return this.$refs.preview.getImageData(width)
      },
      updateFps() {
        const now = window.performance.now()
        const interval = now - this._lastUpdate
        this._lastUpdate = now
        const fps = Math.round(1000 / interval)
        this.$el.querySelector('#fps').textContent = `${fps}FPS`
      },
      showImage(tag, imageData) {
        this.images[tag] = imageData
        this.render()
      },
      drawLines(tag, lineData) {
        this.lines[tag] = lineData
        this.render()
      },
      drawPoints(tag, pointData) {
        this.points[tag] = pointData
        this.render()
      },
      render() {
        if (this.rendering) return;
        this.rendering = true
        requestAnimationFrame(() => {
          this.rendering = false
          for (let tag in this.images) {
            const imageData = this.images[tag]
            const lineData = this.lines[tag]
            if (!imageData) continue;
            this.images[tag] = null
            this.lines[tag] = null

            const canvas = document.getElementById(tag)
            canvas.width = imageData.width
            canvas.height = imageData.height
            const ctx = canvas.getContext('2d')
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.putImageData(imageData, 0, 0)

            if (lineData) {
              for (let i=0; i<lineData.length; i++) {
                const [x1, y1, x2, y2] = lineData[i]
                ctx.strokeStyle = "#FF0000";
                ctx.lineWidth = 2;
                ctx.beginPath()
                ctx.moveTo(x1, y1)
                ctx.lineTo(x2, y2)
                ctx.stroke()
              }
            }
          }

          for (let tag of ['holizonal', 'vertical']) {
            const canvas = document.getElementById(tag)
            const ctx = canvas.getContext('2d')
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            const pointData = this.points[tag]
            const lineData = this.lines[tag]

            if (pointData) {
              for (let i=0; i<pointData.length; i++) {
                let {x, y} = pointData[i]
                ctx.strokeStyle = "#FF0000";
                ctx.beginPath()
                if (y < 0) y = 0;
                if (x < 0) x = 0;
                if (y > 500) y = 500;
                if (x > 500) y = 500;
                ctx.arc(x, y, 3, 0, Math.PI*2, true)
                ctx.fill()
              }
            }
            if (lineData) {
              for (let i=0; i<lineData.length; i++) {
                const [x1, y1, x2, y2] = lineData[i]
                ctx.strokeStyle = "#FF0000";
                ctx.beginPath()
                ctx.moveTo(x1, y1)
                ctx.lineTo(x2, y2)
                ctx.stroke()
              }
            }

          }
        })
      }
    },
    mounted() {
      this._lastUpdate = window.performance.now()
    }
  }

</script>


<style>
#videoWrapper {
  position: relative;
}

.processing-images {
  display: flex;
  justify-content: space-between;
}

.el-card canvas {
  width: 100%;
  max-height: 100%;
}
</style>