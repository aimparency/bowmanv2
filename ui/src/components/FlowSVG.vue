<template>
  <path class="flow"
    :class="{selected, aimSelected}" 
    :fill="fillColor"
    :d="path"
    :stroke-width="strokeWidth"
    @click.stop="select"
  />
</template>

<script lang="ts">
// import Color from 'color'
import { defineComponent, PropType } from 'vue';

import makeCircularPath from '../make-circular-path';
import { Flow, useAimNetwork } from '../stores/aim-network';

import { useUi } from '../stores/ui'; 

export default defineComponent({
  name: 'FlowSVG',
  props: {
    flow: {
      type: Object as PropType<Flow>,
      required: true
    }
  }, 
  data() {
    return {
      aimNetwork: useAimNetwork(), 
      ui: useUi(),
    }
  }, 
  computed: {
    selected() : boolean {
      return this.flow == this.aimNetwork.selectedFlow;
    }, 
    aimSelected() : boolean {
      return this.flow.from == this.aimNetwork.selectedAim ||
        this.flow.into == this.aimNetwork.selectedAim;
    }, 
    strokeWidth() : number {
      return 0.2 * this.flow.into.r * this.flow.share
    }, 
    fillColor() : string {
      return this.flow.from.color
    }, 
    path() : string {
      const from = this.flow.from
      const into = this.flow.into
      return makeCircularPath(
        {pos: from.pos, r: from.r}, 
        into.r * this.flow.share, 
        {pos: into.pos, r: into.r}
      ) 
    }, 
  },
  methods: {
    select() {
      if(this.aimNetwork.selectedFlow == this.flow) {
        this.ui.sideMenuOpen = true
      } else {
        this.aimNetwork.selectFlow(this.flow) 
      }
    }
  }
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.flow {
  transition: stroke 0.2s ease, opacity 0.2s ease;
  stroke: #8880;
  opacity: 0.5; 
  mix-blend-mode: lighten; 
  &:hover {
    stroke: #ffff; 
    opacity: 0.75; 
  }
  &.selected {
    transition: none; 
    stroke: #ffff; 
    opacity: 0.75; 
  }
  &.aimSelected {
    opacity: 0.75; 
  }
  cursor: pointer; 
}
</style>
