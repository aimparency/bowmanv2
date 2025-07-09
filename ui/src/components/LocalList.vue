<template>
  <div class="local-list"> 
    <input type="text" placeholder="search" :value="search" @input="updateSearch"/>
    <div v-if="searchResults.length > 0" class="results">
      <AimLi tabindex="0"
        v-for="result in searchResults"
        :key="result.obj.id"
        :aim="result.obj"
        @click="selectAim(result.obj)"
        @keypress.space="selectAim(result.obj)"
        @keypress.enter="selectAim(result.obj)"
        />
    </div>
    <p v-else>
      No results found
    </p>
    <div class="buttonList">
      <div tabindex="0" class="button" 
        @keypress.enter="addAim"
        @keypress.space="addAim"
        @click.stop="addAim">
        add aim
      </div>
      <!--div tabindex="0" class="button" 
        @keyup.enter="switchToGlobalSearch"
        @keypress.space="switchToGlobalSearch"
        @keypress.enter="switchToGlobalSearch"
        @click.stop="switchToGlobalSearch">
        search globally
      </div-->
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import fuzzysort from 'fuzzysort'

import { useUi } from "../stores/ui"
import { Aim, useAimNetwork } from "../stores/aim-network"

import AimLi from "./AimLi.vue"
import { useMap } from "../stores/map"

import * as vec2 from '../vec2'

export default defineComponent({
  name: "LocalList",
  components: {
    AimLi
  },
  props: {
    msg: String,
  },
  setup() {
    return { 
      aimNetwork: useAimNetwork(),
      ui: useUi(), 
      map: useMap(),
    }
  }, 
  data() {
    return {
      search: "",
    }
  }, 
  computed: {
    searchResults() {
      return fuzzysort.go(this.search, Object.values(this.aimNetwork.aims), {
        key: "title",
        limit: 100, 
        threshold: -10000,
        all: true
      })
    }
  }, 
  methods: {
    switchToGlobalSearch() {
      //TBD
    }, 
    addAim() {
      let map = useMap()
      this.aimNetwork.createAndSelectAim(aim => {
        aim.pos = vec2.crNegate(map.offset) 
        let tR = BigInt(Math.trunc(1000 * 150 / map.scale))
        tR *= tR
        aim.setTokens(tR) 
        aim.tokensOnChain = 0n
      })
    }, 
    selectAim(aim: Aim) {
      this.aimNetwork.focusAim(aim)
    },
    updateSearch(event: any) {
      this.search = event.target.value
    }
  }, 
  
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.local-list {
  input {
    margin: 0.5rem 1rem ;
  }
  .buttonList {
    margin: 0.5rem; 
  }
  .results {
    text-align: left; 
    background-color: #0008; 
    box-shadow: 0 0 1rem #0008; 
    margin: 1rem; 
    padding: 0; 
  }
  p {
    margin: 1rem; 
  }
}
</style>
