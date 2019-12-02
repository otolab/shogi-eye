<template>
  <div>
    <video muted="true" playsinline="true" :width="width" :height="height"></video>
  </div>
</template>


<script>
  import deviceStore from '../deviceStore'
  import {getCanvas} from '../utils/index'

  export default {
    props: {
      selectedDeviceId: {
        type: String
      }
    },
    data() {
      return {
        deviceStoreState: deviceStore.state,
      }
    },
    computed: {
      width() {
        return this.deviceStoreState.width
      },
      height() {
        return this.deviceStoreState.height
      },
      stream() {
        return this.deviceStoreState.stream
      }
    },
    watch: {
      selectedDeviceId(v) {
        deviceStore.setDeviceId(v)
      },
      stream(stream) {
        const video = this._video
        try {
          video.srcObject = stream
          video.play()
        }
        catch (err) {
          console.log(err)
        }
      },
    },
    methods: {
      async play() {
        const video = this._video
        await video.play()
      },
      getImageData(width) {
        const video = this._video
        const scale = width / this.width
        const canvas = getCanvas(width, this.height*scale)
        const ctx = canvas.getContext('2d')

        ctx.drawImage(video, 0, 0, this.width, this.height, 0, 0, canvas.width, canvas.height)
        return ctx.getImageData(0, 0, canvas.width, canvas.height)
      },
    },
    mounted() {
      this._video = this.$el.querySelector('video')
    }
  }

</script>