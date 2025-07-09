<template>
  <div v-if="aimNetwork.allChanges.length == 0">
    <p>No uncommitted changes</p>
  </div>
  <template v-else>
    <div v-if="ui.confirmExit">
      <p class="hint"> 
        If you exit this browser tab, the following uncommitted changes will be lost! 
      </p>
    </div>
    <div class="changeList">
      <div v-for="change in aimNetwork.allChanges" class="changedAim">
        <div
          class="aimButton"
          :class="{disabled: change.aimButtonDisabled}"
          tabindex="0"
          :key="change.aim.id"
          :aim="change.aim"
          @click="!change.aimButtonDisabled && selectAim(change.aim)"
          @keypress.space="!change.aimButtonDisabled && selectAim(change.aim)"
          @keypress.enter="!change.aimButtonDisabled && selectAim(change.aim)"
        > {{ change.aim.title || "[untitled]" }} </div>
        <p v-if="change.uncommitted" class="uncommitted">
          not yet created on chain
        </p>
        <p v-else-if="change.aimChanges.length == 0"> no aim changes </p>
        <div v-else class="changeBox">
          <span 
            class="aimChange"
            v-for="type in change.aimChanges">
            {{ type }}
          </span>
        </div>
        <div class="changedFlowsList" v-if="change.changedFlows.length > 0">
          <div 
            v-for="flow in change.changedFlows"
            class="flowButton"
            @click="selectFlow(flow)"
            @keypress.space="selectFlow(flow)"
            @keypress.enter="selectFlow(flow)">
            {{ flow.from.title || "[untitled]" }}
          </div>
        </div>
      </div>
    </div>
  </template>
  <div class="scrollspace"/>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { Aim, Flow, useAimNetwork } from '../stores/aim-network'
import { useMap } from "../stores/map"
import { useUi } from "../stores/ui";

import AimLi from './AimLi.vue'

export default defineComponent({
  name: "UncommittedChanges",
  components: {
    AimLi
  }, 
  data() {
    return { 
      bla: "asd", 
      aimNetwork: useAimNetwork(), 
      ui: useUi(), 
      map: useMap(), 
    }
  },
  unmounted() {
    this.ui.confirmExit = false
  },
  methods: {
    selectAim(aim: Aim) {
      this.aimNetwork.focusAim(aim)
    },
    selectFlow(flow: Flow) {
      this.aimNetwork.selectFlow(flow)
      this.map.centerOnAim(flow.from) 
    },
    closeAnyway() {
      window.close()
    }
  }
});
</script>

<style scoped lang="less">
.changedFlowsList {
  margin-top: 1rem;
  margin-left: 3em;
}
.flowButton{
  .button(); 
  background-color: shade(@c2, 50%); 
  margin: 0.25rem; 
  &:focus, &:hover{
    background-color: shade(@c2, 30%); 
    outline: none; 
  }
  &.disabled {
    background-color: #aaa; 
    cursor: default; 
  }
}
.aimButton {
  .button(); 
  margin: 0.25rem; 
  &.disabled {
    background-color: #aaa; 
    cursor: default; 
  }
}
.aimChange{
  margin: 0.25rem; 
  padding: 0.25rem; 
  border-radius:0.25rem; 
  background-color: #8888; 
  white-space: nowrap;
}
.changeList {
  text-align: left;
  padding: 0rem; 
}
.changedAim {
  margin: 1rem; 
  padding: 0.5rem;
  background-color: #0004; 
  border-radius: 0.5rem; 
  p {
    margin: 0.25rem 0.5rem; 
  }
}
.changeBox {
  margin: 0.5rem 0rem; 
}
</style>
