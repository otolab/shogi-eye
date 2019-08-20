
class DeviceStore {
  constructor() {
    this.state = {
      devices: [],
      width: 0,
      height: 0,
      stream: null
    }
  }

  async init() {
    const devices = await navigator.mediaDevices.enumerateDevices()
    this.state.devices = devices.filter((d) => d.kind === 'videoinput')
  }

  async setDeviceId(deviceId) {
    this.state.stream = await this._getNewStream(deviceId)

    if (!this.state.stream) return;

    const settings = this.state.stream.getVideoTracks()[0].getSettings()
    const {width, height} = settings
    this.state.width = width
    this.state.height = height
  }

  _closeStream() {
    if (this.state.stream) {
      const oldStream = this.state.stream
      this.state.stream = null
      oldStream.getTracks().forEach((track) => track.stop())
    }
  }

  async _getNewStream(deviceId) {
    this._closeStream()

    if (deviceId === null) return;

    const option = {
      video: true,
      audio: false
    }

    if (deviceId) {
      option.video = {
        deviceId
      }
    }

    return await navigator.mediaDevices
      .getUserMedia(option)
  }

}


export default new DeviceStore()