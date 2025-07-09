<template>
  <div class="head">
    <h2 class='tab'
      v-for="tab, key in ui.tabs" :key="key"
      tabindex=0
      @keydown.enter.prevent.stop="ui.openTab = tab"
      @keydown.space.prevent.stop="ui.openTab = tab"
      @click="ui.openTab = tab"
      :class="{active: tab == ui.openTab}"
      >
      {{ tab }}
    </h2>
  </div>
  <LocalList v-if="ui.openTab == 'aims'"/>
  <UncommittedChanges v-if="ui.openTab == 'changes'"/>
</template>

<script lang="ts">
import { defineComponent } from "vue"

import LocalList from "./LocalList.vue"
import UncommittedChanges from "./UncommittedChanges.vue"

import { useUi } from "../stores/ui"

export default defineComponent({
  name: "TabbedMenu",
  components: {
    LocalList, 
    UncommittedChanges
  },
  setup() {
    return { 
      ui: useUi(),
    }
  }, 
  data() {
    return {}
  },
  computed: {
  }, 
  methods: {
  }
});
</script>

<style scoped lang="less">
.head{
  background-color: mix(@bg2, #111, 30%); 
  height: 5rem; 
  .tab {
    font-weight: bold; 
    padding: 1rem;
    border-top-left-radius: 1rem; 
    border-top-right-radius: 1rem; 
    margin-top: 1rem;
    background-color: mix(@bg2, #111, 30%); 
    user-select:none; 
    cursor:pointer; 
    display: inline-block; 
    color: #ccc; 
    transition: background-color 0.2s ease-in-out, border-bottom-color 0.2s ease-in-out;
    border-bottom: 0.25rem solid @bg2; 
    &:hover, &:focus{
      outline: none; 
      border-bottom-color: @c2; 
      background-color: #fff1; 
    }
    &.active {
      transition: none; 
      color: white; 
      border-bottom-color: @bg2;
      background-color: @bg2; 
    }
  }
  margin-bottom: 1rem;
}
</style>
