<template>
  <path
    class="connector"
    fill="white"
    :d="path"
    :stroke-width="connectFrom.r"
  />
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import makeCircularPath from '../make-circular-path';
import { Aim } from '../stores/aim-network';
import { useMap } from '../stores/map';

export default defineComponent({
  name: 'NodeTools',
  emits: [
    'startMove', 
    'stopMove'
  ], 
  data() {
    return {
      map: useMap()
    }
  },
  props: {
    connectFrom: {
      type: Object as PropType<Aim>,
      required: true
    }
  },
  computed: {
    path() : string {
      return makeCircularPath(
        {
          pos: this.connectFrom.pos,
          r: this.connectFrom.r
        }, 
        0.5 * this.connectFrom.r,
        {
          pos: this.map.mouse.logical,
          r: 0
        }
      )
    }
  }
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.connector{
  fill: #bbb; 
}
</style>
