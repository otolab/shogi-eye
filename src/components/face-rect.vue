<template>

  <div class="faceRect" :style="styles">
  </div>

</template>


<script>

  export default {
    props: {
      rect: Object,
      scale: Number
    },
    computed: {
      styles() {
        const {rect} = this
        return Object.assign({}, rect)
      }
    }
  }

</script>


<style>
  .faceRect {
    position: absolute;
    border: 10px solid gray;
  }
</style>