<template>
  <circle class="handle" 
    :class="{dragging: map.layouting}"
    :cx="fromPos[0]" :cy="fromPos[1]" :r="flow.from.r" 
    @mousedown="startLayouting(true)" 
    @touchstart="startLayouting(true)"
    @click.stop="selectAim(flow.from)"
    :stroke-width="flow.from.r * 0.05" />
  <circle class="handle" :cx="intoPos[0]" :cy="intoPos[1]" :r="flow.into.r"
    :class="{dragging: map.layouting}"
    @mousedown="startLayouting(false)" 
    @touchstart="startLayouting(false)"
    @click.stop="selectAim(flow.into)"
    :stroke-width="flow.into.r * 0.05" />
  <line class="handle line" :x1="fromPos[0]" :y1="fromPos[1]" :x2="intoPos[0]" :y2="intoPos[1]" 
    :class="{dragging: map.layouting}"
    :stroke-width="flow.from.r * 0.05" />
</template>

<script lang="ts">
//:stroke-dasharray="flow.from.r * 0.15 + ' ' + flow.from.r * 0.3"

// import Color from 'color'
import { defineComponent, PropType } from 'vue';

import { Aim, Flow, useAimNetwork } from '../stores/aim-network';
import { useMap } from '../stores/map';

import * as vec2 from '../vec2';

export default defineComponent({
  name: 'FlowHandleSVG',
  props: {
    flow: {
      type: Object as PropType<Flow>,
      required: true
    }
  }, 
  data() {
    return {
      aimNetwork: useAimNetwork(), 
      map: useMap()
    }
  }, 
  computed: {
    intoPos() {
      return vec2.crAdd(this.M, vec2.crScale(this.flow.relativeDelta, this.flow.from.r))
    }, 
    fromPos() {
      return vec2.crSub(this.M, vec2.crScale(this.flow.relativeDelta, this.flow.into.r))
    },
    M() {
      const from = this.flow.from;
      const into = this.flow.into;
      let rSum = from.r + into.r;
      return vec2.fromValues(
        (from.pos[0] * from.r + into.pos[0] * into.r)/rSum,
        (from.pos[1] * from.r + into.pos[1] * into.r)/rSum
      )
    }
  }, 
  methods: {
    startLayouting(from: boolean) {
      this.map.startLayouting({
        fromWeight: this.flow.from.r / (this.flow.from.r + this.flow.into.r), 
        start: from ? this.fromPos : this.intoPos, 
        // scale * measured logical new from=>M should equal new relativeDelta
        // hinrichtung: d = relativeDelta * (r1 + r2) / (r1 + r2) * rInto
        // rueckrichtung: relativeDelta = d / rInto 
        dScale: from ? -1 / this.flow.into.r : 1 / this.flow.from.r, 
        flow: this.flow, 
      });
    }, 
    selectAim(aim: Aim) {
      if(!this.map.cursorMoved) {
        this.aimNetwork.selectAim(aim);
      }
    }
  }
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.handle{
  fill: #fff4; 
  stroke: #fff8;
  stroke-linecap: round;
  transition: fill 0.2s, stroke 0.2s;
  &.line {
    pointer-events: none;
    stroke: #fff0; 
  }
  &:hover , &.dragging{
    fill: #fffa; 
    stroke: #fff; 
  }
  cursor: pointer; 
}
</style>
