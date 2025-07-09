<template>
  <div class="slider">
    <div class="value">
      {{name}}:
      <input :value="value" @change="setValue" tabindex="0"/> 
      {{unit}}
    </div>
    <div class="left">{{left}}</div>
    <div class="right">{{right}}</div>
    <div class="bar" ref="bar">
      <div class="dot"
        :style="style"
        :class="{dragging}"
        tabindex="0"
        @keydown.stop.prevent.right="increase"
        @keydown.stop.prevent.left="decrease"
        @mousedown.prevent="startDrag"
        @touchstart.prevent="startDrag">
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

export default defineComponent({
  emits: ['update', 'drag-end'],
  props: {
    name: String,
    from: {
      type: BigInt as unknown as PropType<bigint>,
      required: true
    },
    to: {
      type: BigInt as unknown as PropType<bigint>,
      required: true
    },
    value: {
      type: BigInt as unknown as PropType<bigint>,
      required: true
    },
    left: {
      type: String,
      default: 'low'
    },
    right: {
      type: String,
      default: 'high'
    },
    unit: {
      type: String,
      default: ''
    }
  },
  setup() {
    return {
      dragging: false,
      dragOffset: 0,
      x0: 0,
      width: 1
    }
  },
  mounted () {
    document.addEventListener('mouseup', this.endMouse)
    document.addEventListener('mouseleave', this.endMouse)
    document.addEventListener('mousemove', this.drag)

    document.addEventListener('touchend', this.endTouch)
    document.addEventListener('touchcancel', this.endTouch)
    document.addEventListener('touchmove', this.drag)
  },
  computed: {
    style() {
      const progress = (this.value - this.from)
      const width = (this.to - this.from) 
      const promille = progress * 1000n / width 
      return {
        left: Number(promille.toString()) * 0.1 + "%"
      }
    }
  },
  methods: {
    startDrag (e: MouseEvent | TouchEvent) {
      const bound = (this.$refs.bar as HTMLDivElement).getBoundingClientRect()
      this.x0 = bound.left
      this.width = bound.right - bound.left
      this.dragOffset = 0
      const v = this.getV(e)
      this.dragging = true
      const promille = (this.value - v) * 1000n / (this.to - this.from)
      this.dragOffset = Number(promille.toString()) * 0.001
    },
    endMouse (e: MouseEvent | TouchEvent) {
      this.drag(e)
      this.endDrag()
    },
    endTouch () {
      this.endDrag()
    },
    endDrag () {
      if (this.dragging) {
        this.dragging = false
        this.$emit('drag-end')
      }
    },
    drag (e: MouseEvent | TouchEvent) {
      if (this.dragging) {
        const v = this.getV(e)
        this.$emit('update', v)
      }
    },
    setValue(e: Event) {
      try{
        let v = BigInt((<HTMLInputElement>e.target).value)
        this.$emit('update', v)
        this.$emit('drag-end')
      } catch {}
    },
    getV (e: MouseEvent | TouchEvent) {
      let x = 0
      if (e instanceof MouseEvent) {
        x = e.x
      } else if (e instanceof TouchEvent) {
        x = e.touches[0].pageX
      }
      let r = (x - this.x0) / this.width
      r += this.dragOffset
      r = Math.min(1, Math.max(0, r))
      const promille = BigInt(Math.trunc(r * 1000))
      return this.from + (this.to - this.from) * promille / 1000n
    },
    beforeUnmount () {
      document.removeEventListener('mouseup', this.endDrag)
      document.removeEventListener('mouseleave', this.endDrag)
      document.removeEventListener('mousemove', this.drag)

      document.removeEventListener('touchend', this.endDrag)
      document.removeEventListener('touchcancel', this.endDrag)
      document.removeEventListener('touchmove', this.drag)
    }, 
    increase() {
      this.clampAndSend(this.value + (this.to - this.from) / 10n)
    }, 
    decrease() {
      this.clampAndSend(this.value - (this.to - this.from) / 10n)
    }, 
    clampAndSend(v: bigint) {
      if(v > this.to) {
        v = this.to
      } else if(v < this.from) {
        v = this.from
      }
      this.$emit('update', v) 
      this.$emit('drag-end') 
    }
  }
})
</script>

<style lang="less">
@dotsize: 3rem;
@import "./slider.scss";

</style>
