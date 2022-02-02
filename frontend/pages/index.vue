<template>
  <div class="main__container">
    <div class="main">
      <div class="title">WebRTC Meeting</div>
      <div class="input-wrapper">
        <input type="text" placeholder="Please enter a room name." v-model="roomName">
      </div>
      <button @click="onClickEnter">ENTER</button>
    </div>
    <div class="copyright">
      <span class="copyright__text">©sachio</span>
    </div>
  </div>
</template>

<script>
export default {
  components: {},
  computed: {},
  data() {
    return {
      roomName: ''
    }
  },
  async mounted() {
  },
  methods: {
    onClickEnter() {
      if (this.roomName.length === 0 || /^\s*$/.test(this.roomName)) {
        return
      }
      location.href = `/r/${this.roomName}`
    }
  }
}
</script>

<style lang="scss" scoped>
  .main__container {
    height: 100vh;
    width: 100vw;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .main {
    width: 25em;
  }

  .title {
    color: #ffffff;
    font-size: 32px;
    font-weight: 600;
    margin-bottom: 32px;
  }

  .input-wrapper {
    margin-bottom: 24px;
  }

  input[type='text'] {
    background-color: transparent;
    border: none;
    outline: none;
    border-bottom: solid 1px #4c4c4f;
    color: #fff;
    font-size: 1em;
    padding: .4em 0;
    width: 100%;
  }

  button {
    outline: none;
    background-color: #4285F4;
    border: none;
    border-radius: 2px;
    -webkit-box-shadow: 1px 1px 5px 0 rgba(0, 0, 0, .5);
    -moz-box-shadow: 1px 1px 5px 0 rgba(0, 0, 0, .5);
    box-shadow: 1px 1px 5px 0 rgba(0, 0, 0, .5);
    color: white;
    font-size: 0.8em;
    height: 2.75em;
    margin: 0 5px 20px 5px;
    padding: 0.5em 0.7em 0.5em 0.7em;
    width: 8em;
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
