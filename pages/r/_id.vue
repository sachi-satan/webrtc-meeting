<template>
  <div class="bg">
    <div class="top-left">
      <div v-if="participants > 0">
        <div class="participants">
          <div class="participants__icon-wrapper">
            <i class="material-icons participants__icon">supervisor_account</i>
          </div>
          <div class="participants__text">{{participants}} Participants</div>
        </div>
        <span class="time">{{elapsedTime}}</span>
      </div>
    </div>
    <div class="top-right">
      <video
        width="160" height="120"
        class="my-video"
        ref="myVideo"
      />
    </div>
    <div class="video-list" id="container"></div>
    <div class="main">
      <video
        class="main__video"
        ref="mainVideo"
      />
    </div>
    <div v-if="chatOpened" class="bottom-right">
      <div class="chat">
        <div class="chat__header">Chat</div>
        <div class="chat__main">
          <div class="chat__message-container">
            <div v-for="(message, index) in messages" :key="_id">
              <span class="chat__text">{{message}}</span>
            </div>
          </div>
        </div>
        <div class="chat__bottom">
          <input type="text" @keydown.enter="onKeyUpEnter" v-model="inputText" class="chat__input" placeholder="ここにメッセージを入力します。">
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="footer__item-container">
        <div class="footer__item" @click="onClickStopVideo">
          <i v-if="videoEnabled" class="material-icons footer__item-icon">videocam</i>
          <i v-else class="material-icons footer__item-icon">videocam_off</i>
          <!--<span class="footer__item-text">ビデオの停止</span>-->
        </div>
        <div class="footer__item" @click="onClickMuteAudio">
          <i v-if="audioEnabled" class="material-icons footer__item-icon">mic</i>
          <i v-else class="material-icons footer__item-icon">mic_off</i>
          <!--<span class="footer__item-text">ミュート</span>-->
        </div>
        <div class="footer__item" @click="onClickShareScreen">
          <i class="material-icons footer__item-icon">screen_share</i>
          <!--<span class="footer__item-text">画面の共有</span>-->
        </div>
        <div class="footer__item" @click="onClickChat">
          <i class="material-icons footer__item-icon">chat_bubble</i>
          <!--<span class="footer__item-text">チャット</span>-->
        </div>
        <div class="footer__item-hangup" @click="onClickExit">
          <i class="material-icons footer__item-icon">call_end</i>
          <!--<span class="footer__item-text">通話を終了</span>-->
        </div>
      </div>
    </div>
    <div class="copyright">
      <span class="copyright__text">©sachio</span>
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client'

export default {
  components: {},
  computed: {},
  data() {
    return {
      socket: null,
      localStream: null,
      localScreenStream: null,

      peerConnections: {},
      videoStreams: {},

      videoSenders: {},
      audioSenders: {},

      mainVideo: null,
      mainVideoId: 0,
      myVideo: null,
      videoElements: {},

      inputText: '',
      messages: [],

      participants: 0,
      startTime: null,
      elapsedTime: '0:00',

      videoEnabled: true,
      audioEnabled: true,
      screenSharing: false,
      chatOpened: false
    }
  },
  async mounted() {
    this.mainVideo = this.$refs.mainVideo
    this.mainVideo.volume = 0

    this.myVideo = this.$refs.myVideo
    this.myVideo.volume = 0

    this.socket = io()

    const roomId = this.$route.params.id

    this.socket.on('connect', (evt) => {
      this.socket.emit('enter', roomId)

      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        this.localStream = stream
        this.playVideo(this.myVideo, stream)
        this.updateVideoFlip(this.myVideo, true)
        this.connect()

        this.participants++
        this.startTime = new Date()

        setInterval(() => {
          const now = new Date()

          const datet = parseInt((now.getTime() - this.startTime.getTime()) / 1000)

          let min = parseInt((datet / 60) % 60)
          let sec = datet % 60

          if (sec < 10) {
            sec = '0' + sec
          }

          this.elapsedTime = min + ':' + sec
        }, 1000)
      }).catch((error) => {
        console.error(error)
      })
    })

    this.socket.on('message', (message) => {
      let fromId = message.from
      if (message.type === 'offer') {
        console.log('received offer')
        let offer = new RTCSessionDescription(message)
        this.setOffer(fromId, offer)
      }
      else if (message.type === 'answer') {
        console.log('received answer')
        let answer = new RTCSessionDescription(message)
        this.setAnswer(fromId, answer)
      }
      else if (message.type === 'candidate') {
        console.log('received ICE candidate')
        let candidate = new RTCIceCandidate(message.ice)
        console.log(candidate)
        this.addIceCandidate(fromId, candidate)
      }
      else if (message.type === 'call me') {
        if (!this.isReadyToConnect()) {
          console.log('not ready to connect')
        } else if (this.isConnectedWith(fromId)) {
          console.log('already connected')
        } else {
          this.makeOffer(fromId)
        }
      }
      else if (message.type === 'bye') {
        if (this.isConnectedWith(fromId)) {
          this.stopConnection(fromId)
        }
      }
      else if (message.type === 'message') {
        this.messages.push(message.text)
      }
    })

    this.socket.on('user disconnected', (evt) => {
      let id = evt.id
      if (this.isConnectedWith(id)) {
        this.stopConnection(id)
      }
    })
  },
  methods: {
    // socket
    emitRoom(msg) {
      this.socket.emit('message', msg)
    },
    emitTo(id, msg) {
      msg.sendto = id
      this.socket.emit('message', msg)
    },

    // video element
    getVideoElement(id) {
      return this.videoElements[id]
    },
    addVideoElement(id, video) {
      this.videoElements[id] = video
    },
    deleteVideoElement(id) {
      delete this.videoElements[id]
    },
    hasVideoElement(id) {
      return !!this.videoElements[id]
    },

    // video stream
    getVideoStream(id) {
      return this.videoStreams[id]
    },
    addVideoStream(id, stream) {
      this.videoStreams[id] = stream
    },
    deleteVideoStream(id) {
      delete this.videoStreams[id]
    },

    // peer connection
    getConnection(id) {
      return this.peerConnections[id]
    },
    addConnection(id, peer) {
      this.peerConnections[id] = peer
    },
    deleteConnection(id) {
      delete this.peerConnections[id]
    },
    isReadyToConnect() {
      return !!this.localStream
    },
    isConnectedWith(id) {
      return !!this.getConnection(id)
    },

    // sender
    addVideoSender(id, sender) {
      this.videoSenders[id] = sender
    },
    addAudioSender(id, sender) {
      this.audioSenders[id] = sender
    },

    // track
    addTrackToPeer(id, peer) {
      if (this.localStream.getVideoTracks()) {
        const track = this.localStream.getVideoTracks()[0]
        const sender = peer.addTrack(track, this.localStream)
        this.addVideoSender(id, sender)
      }

      if (this.localStream.getAudioTracks()) {
        const track = this.localStream.getAudioTracks()[0]
        const sender = peer.addTrack(track, this.localStream)
        this.addAudioSender(id, sender)
      }
    },
    replaceVideoTrack(stream) {
      for (let k of Object.keys(this.videoSenders)) {
        stream.getTracks().forEach(track => this.videoSenders[k].replaceTrack(track))
      }
    },

    // video
    createVideoElement(elementId, id) {
      let video = document.createElement('video')
      video.className = 'video-list__video'
      video.id = elementId
      video.onclick = () => {
        this.onClickVideo(id)
      }
      let container = document.getElementById('container')
      container.appendChild(video)
      return video
    },
    removeVideoElement(elementId) {
      let video = document.getElementById(elementId)
      let container = document.getElementById('container')
      container.removeChild(video)
    },
    attachVideo(id, stream) {
      let video = this.createVideoElement('remote_video_' + id, id)
      this.addVideoElement(id, video)
      this.playVideo(video, stream)
    },
    detachVideo(id) {
      this.removeVideoElement('remote_video_' + id)
      this.deleteVideoElement(id)
    },
    playVideo(element, stream) {
      element.srcObject = stream
      element.play()
    },
    updateVideoFlip(element, flip) {
      if (flip) {
        if (!element.classList.contains('flip')) {
          element.classList.add('flip')
        }
      } else {
        if (element.classList.contains('flip')) {
          element.classList.remove('flip')
        }
      }
    },
    switchMainVideoSrc(id) {
      if (Object.keys(this.videoStreams).length > 0) {
        for (let k of Object.keys(this.videoStreams)) {
          this.mainVideoId = id
          this.playVideo(this.mainVideo, this.videoStreams[k])
          break
        }
      } else {
        this.mainVideo.srcObject = null
      }
    },

    // WebRTC
    sendIceCandidate(id, candidate) {
      if (this.isConnectedWith(id)) {
        let obj = { type: 'candidate', ice: candidate }
        this.emitTo(id, obj)
      }
      else {
        console.warn('connection NOT EXIST or ALREADY CLOSED. so skip candidate')
      }
    },
    prepareNewConnection(id) {
      let pc_config = {
        'iceServers': [
          { 'url': 'stun:stun.l.google.com:19302' },
          { 'url': 'turn:turn.coogic.com:80', 'username': 'actor', 'credential': 'password' }]
      }
      let peer = new RTCPeerConnection(pc_config)
      peer.ontrack = (event) => {
        let stream = event.streams[0]
        console.log('ontrack: stream.id=', stream.id)
        if (this.hasVideoElement(id)) {
          console.log('already has video element')
        }
        else {
          this.attachVideo(id, stream)
          this.addVideoStream(id, stream)
          if (this.mainVideo.srcObject === null) {
            this.switchMainVideoSrc(id)
          }

          this.participants++
        }
      }
      peer.onicecandidate = (evt) => {
        if (evt.candidate) {
          this.sendIceCandidate(id, evt.candidate)
        } else {
          console.log('empty ice event')
        }
      }
      peer.onnegotiationneeded = (evt) => {
        console.log('onnegotiationneeded:', evt)
      }
      peer.onicecandidateerror = (evt) => {
        console.error('onicecandidateerror: ', evt)
      }
      peer.onsignalingstatechange = () => {
        console.log('onsignalingstatechange:', peer.signalingState)
      }
      peer.oniceconnectionstatechange = () => {
        console.log('oniceconnectionstatechange:', peer.iceConnectionState)
        if (peer.iceConnectionState === 'disconnected') {
          this.stopConnection(id)
        }
      }
      peer.onicegatheringstatechange = () => {
        console.log('onicegatheringstatechange:', peer.iceGatheringState)
      }
      peer.onconnectionstatechange = () => {
        console.log('onconnectionstatechange:', peer.connectionState)
      }
      peer.onremovestream = (event) => {
        console.log('onremovestream:', event)
        this.detachVideo(id)
        this.deleteVideoStream(id)
      }

      this.addTrackToPeer(id, peer)
      return peer
    },
    makeOffer(id) {
      let peerConnection = this.prepareNewConnection(id)
      this.addConnection(id, peerConnection)
      peerConnection.createOffer().then((sessionDescription) => {
        return peerConnection.setLocalDescription(sessionDescription)
      }).then(() => {
        this.sendSdp(id, peerConnection.localDescription)
      }).catch((err) => {
        console.error(err)
      })
    },
    setOffer(id, sessionDescription) {
      let peerConnection = this.prepareNewConnection(id)
      this.addConnection(id, peerConnection)
      peerConnection.setRemoteDescription(sessionDescription).then(() => {
        this.makeAnswer(id)
      }).catch((err) => {
        console.error(err)
      })
    },
    makeAnswer(id) {
      let peerConnection = this.getConnection(id)
      peerConnection.createAnswer().then((sessionDescription) => {
        return peerConnection.setLocalDescription(sessionDescription)
      }).then(() => {
        this.sendSdp(id, peerConnection.localDescription)
      }).catch((err) => {
        console.error(err)
      })
    },
    setAnswer(id, sessionDescription) {
      let peerConnection = this.getConnection(id)
      peerConnection.setRemoteDescription(sessionDescription).then(() => {
      }).catch((err) => {
        console.error(err)
      })
    },
    addIceCandidate(id, candidate) {
      if (!this.isConnectedWith(id)) {
        console.warn('NOT CONNEDTED or ALREADY CLOSED with id=' + id + ', so ignore candidate')
        return
      }

      let peerConnection = this.getConnection(id)
      peerConnection.addIceCandidate(candidate)
    },
    connect() {
      if (this.isReadyToConnect()) {
        this.callMe()
      }
    },
    sendSdp(id, sessionDescription) {
      let message = { type: sessionDescription.type, sdp: sessionDescription.sdp }
      this.emitTo(id, message)
    },
    callMe() {
      this.emitRoom({ type: 'call me' })
    },
    hangUp() {
      this.emitRoom({ type: 'bye' })
      this.stopAllConnection()
    },
    stopConnection(id) {
      this.detachVideo(id)
      this.deleteVideoStream(id)
      let peer = this.getConnection(id)
      peer.close()
      this.deleteConnection(id)
      this.participants--

      if (id === this.mainVideoId) {
        this.switchMainVideoSrc()
      }
    },
    stopAllConnection() {
      for (let id in this.peerConnections) {
        this.stopConnection(id)
      }
    },

    async startVideo() {
      let stream = this.localStream
      this.playVideo(this.myVideo, stream)
      this.updateVideoFlip(this.myVideo, true)
      this.replaceVideoTrack(stream)
    },
    async startScreenShare() {
      if (navigator.getDisplayMedia) {
        let stream = await navigator.getDisplayMedia({ video: true })
        this.localScreenStream = stream
        this.playVideo(this.myVideo, stream)
        this.updateVideoFlip(this.myVideo, false)
        this.replaceVideoTrack(stream)
        stream.addEventListener('inactive', (e) => {
          this.screenSharing = false
          this.startVideo()
        })
        this.screenSharing = true
      } else if (navigator.mediaDevices.getDisplayMedia) {
        let stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        this.localScreenStream = stream
        this.playVideo(this.myVideo, stream)
        this.updateVideoFlip(this.myVideo, false)
        this.replaceVideoTrack(stream)
        stream.addEventListener('inactive', (e) => {
          this.screenSharing = false
          this.startVideo()
        })
        this.screenSharing = true
      }
    },

    // action event
    onClickVideo(id) {
      this.mainVideoId = id
      const stream = this.getVideoStream(id)
      this.playVideo(this.mainVideo, stream)
    },
    onClickStopVideo() {
      this.localStream.getVideoTracks()[0].enabled = !(this.localStream.getVideoTracks()[0].enabled)
      this.videoEnabled = this.localStream.getVideoTracks()[0].enabled
    },
    onClickMuteAudio() {
      this.localStream.getAudioTracks()[0].enabled = !(this.localStream.getAudioTracks()[0].enabled)
      this.audioEnabled = this.localStream.getAudioTracks()[0].enabled
    },
    onClickShareScreen() {
      this.startScreenShare()
    },
    onClickChat() {
      this.chatOpened = !this.chatOpened
    },
    onClickExit() {
      this.hangUp()
      location.href = `/`
    },
    onKeyUpEnter(event) {
      if (event.keyCode !== 13) return
      this.messages.push(this.inputText)
      const obj = { type: 'message', text: this.inputText }
      this.emitRoom(obj)
      this.inputText = ''
    }
  }
}
</script>

<style lang="scss">
  .main {
    height: 100vh;
    width: 100vw;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .top-left {
    position: absolute;
    left: 32px;
    top: 32px;
  }

  .top-right {
    position: absolute;
    right: 32px;
    top: 32px;
  }

  .bottom-right {
    position: absolute;
    right: 24px;
    bottom: 0;
    z-index: 1;
  }

  .flip {
    -webkit-transform: scaleX(-1);
  }

  /*participants*/

  .participants {
    display: flex;
    align-items: center;
  }

  .participants__icon-wrapper {
    width: 32px;
    height: 32px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .participants__icon {
    color: #ffffff;
  }

  .participants__text {
    color: #ffffff;
    margin-left: 8px;
    font-weight: 600;
  }

  /*time*/

  .time {
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    margin-left: 40px;
  }

  /*main video*/

  .main__video {
    height: 80%;
    object-fit: cover
  }

  /*my video*/

  .my-video {
    border-radius: 4px;
  }

  /*video list*/

  .video-list {
    position: absolute;
    left: 24px;
    top: 128px;
    display: flex;
    flex-direction: column;
    z-index: 1;
  }

  .video-list__video {
    width: 100px;
    height: 100px;
    object-fit: cover
  }

  /*footer*/

  .footer {
    display: flex;
    justify-content: center;
    position: absolute;
    bottom: 0;
    width: 100%;
    padding: 0 0 24px 0;
  }

  .footer__item-container {
    display: flex;
    justify-self: center;

    > :not(:last-child) {
      margin-right: 24px;
    }
  }

  .footer__item {
    width: 56px;
    height: 56px;
    border-radius: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.38);

    &:hover {
      cursor: pointer;
    }
  }

  .footer__item-hangup {
    width: 48px;
    height: 48px;
    border-radius: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #db4437;

    &:hover {
      cursor: pointer;
    }
  }

  .footer__item-icon {
    color: #dcdcdc;
    font-size: 24px;
  }

  /*chat*/

  .chat {
    width: 320px;
    height: 480px;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    border-radius: 4px 4px 0 0;
  }

  .chat__header {
    padding: 8px 12px;
    text-align: center;
    font-weight: 600;
    flex-shrink: 0;
  }

  .chat__main {
    flex-grow: 1;
    padding: 8px 12px;
    overflow-y: scroll;
  }

  .chat__message-container {
    > :not(:last-child) {
      margin-bottom: 4px;
    }
  }

  .chat__text {
    font-size: 14px;
  }

  .chat__bottom {
    flex-shrink: 0;
    padding: 24px 12px;
  }

  .chat__input {
    border-style: none;
    width: 100%;
    font-size: 14px;

    &:focus {
      outline: none;
    }
  }

  /*copyright*/

  .copyright {
    position: absolute;
    right: 12px;
    bottom: 12px;

  }

  .copyright__text {
    color: rgba(255, 255, 255, 0.38);
    font-size: 12px;

  }
</style>
