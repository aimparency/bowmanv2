<template>
  <div class="multi-switch">
    <span v-if="label" class="label"> {{ label }}: </span>
    <div 
      v-for="option, i in options"
      :key="i"
      :tabindex="disabled ? -1 : 0"
      :style="{backgroundColor: option.color}"
      class="option"
      :class="{ selected: option.value == value}"
      @keypress.space.prevent="select(i)"
      @keypress.enter="select(i)"
      @click="select(i)">
      {{ option.value }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

interface Option {
 value: string, 
 color: string
}

export default defineComponent({
  emits: ['change'],
  props: {
    label: {
      type: String, 
    }, 
    options: {
      type: Array as PropType<Option[]>,
      required: true  
    }, 
    value: {
      type: String, 
      required: true
    }, 
    disabled: {
      type: Boolean, 
      default: false
    }
  },
  methods: {
    select(i: number) {
      if(!this.disabled) {
        this.$emit('change', this.options[i].value) 
      }
    },
  }
})
</script>

<style lang="less">
@dotsize: 3em;

.multi-switch {
  margin: 1rem 0.5rem; 
  .option {
    user-select:none; 
    margin: 0.25rem;
    display: inline-block; 
    opacity: 0.9; 
    cursor: pointer;        
    padding: 0.5rem; 
    color: #fff; 
    border-radius: 0.2rem; 
    box-shadow: 0 0 0.5rem #0008; 
    &:focus {
      outline: 0.2rem solid #fff8; 
    }
    &.selected {
      opacity: 1; 
      outline: 0.2rem solid #ffff;
    }
  }
}
</style>
