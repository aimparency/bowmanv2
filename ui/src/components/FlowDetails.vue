<template>
  <div 
    @keydown.esc="aimNetwork.deselect"
    class="flow-details"> 
    <h2>flow</h2>
    <div
      tabindex="0"
      @keypress.enter.prevent.stop="aimNetwork.selectAim(flow.from)"
      @keypress.space.prevent.stop="aimNetwork.selectAim(flow.from)"
      @click='aimNetwork.selectAim(flow.from)'
      class='button aim'> 
      {{ flow.from.title || "<unnamed>" }} 
    </div>
    contributes to
    <div
      tabindex="0"
      @keypress.enter.prevent.stop="aimNetwork.selectAim(flow.into)"
      @keypress.space.prevent.stop="aimNetwork.selectAim(flow.into)"
      @click='aimNetwork.selectAim(flow.into)'
      class='button aim'> 
      {{ flow.into.title || "<unnamed>"}} 
    </div>
    <div class="block">
      <textarea
        ref='explanation'
        rows="9"
        placeholder="flow explanation"
        :disabled="!flow.into.mayNetwork()"
        :value="flow.explanation"
        @input="updateExplanation"></textarea>
      <Slider
        v-if="flow.into.mayNetwork()"
        name='weight'
        left='0'
        right='100'
        :disabled="!flow.into.mayNetwork()"
        :factor="100/0xffff"
        :decimalPlaces='2'
        :from='0'
        :to='0xffff'
        :value='flow.weight'
        @update='updateWeight'/>
      <p v-else> weight: {{ Math.round(100 * flow.weight / 0xffff) }}% </p>
      <div class="relativePositionHint" v-if="flow.origin.relativeDelta != undefined">
        <p>relative positioning changed</p>
      </div>
      <div>
        <span v-if='!flow.published'>
          <p class=hint v-if='flow.into.address == undefined || flow.from.address == undefined'>
            Before creating this flow on chain, both involved aims have to be created on chain</p>
          <div v-else class='button' tabindex="0" 
            @keypress.enter.prevent.stop="create"
            @keypress.space.prevent.stop="create"
            @click="create">create flow on chain</div>
        </span>
        <span v-else-if='dirty'>
          <div class='button' tabindex="0" v-if='dirty' 
            @keypress.enter.prevent.stop="reset"
            @keypress.space.prevent.stop="reset"
            @click="reset">reset</div>
          <div class='button' tabindex="0" v-if='dirty' 
            @keypress.enter.prevent.stop="commit"
            @keypress.space.prevent.stop="commit"
            @click="commit">commit changes</div>
        </span>
        <div
          v-if="!flow.published"
          class='button' 
          :class='{confirm: confirmRemove}'
          @blur='confirmRemove = false'
          tabindex="0"  
          @keypress.enter.prevent.stop="remove"
          @keypress.space.prevent.stop="remove"
          @click="remove">{{ confirmRemove ? "confirm removal" : "remove" }}</div>
      </div>
      <div 
        :class="{deactivated: !flow.transactionPending}"
        class=overlay />
    </div>
    <div class="scrollspace"></div>
    <BackButton 
      tabindex="0"  
      @keypress.enter.prevent.stop="aimNetwork.deselect"
      @keypress.space.prevent.stop="aimNetwork.deselect"
      @click="aimNetwork.deselect"/>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"

import { useUi } from "../stores/ui"
import { Flow, useAimNetwork } from "../stores/aim-network"

import AimLi from "./AimLi.vue"
import MultiSwitch from './MultiSwitch.vue'
import Slider from './Slider.vue'
import BackButton from './SideBar/BackButton.vue'

export default defineComponent({
  name: "FlowDetails",
  components: {
    AimLi,
    MultiSwitch,
    Slider, 
    BackButton,
  },
  props: {
    flow: {
      type: Object as PropType<Flow>,
      required: true
    }
  },
  data() {
    const aimNetwork = useAimNetwork()
    const ui = useUi()
    return { 
      aimNetwork, 
      ui, 
      confirmRemove: false, 
    }
  }, 
  mounted() {
    this.init()
  },
  watch: {
    flow: {
      handler(_new, _old) {
        this.init()
      },
      deep: false
    }
  },
  computed: {
    dirty() : boolean {
      return ( 
        Object.values(this.flow.origin).filter((v: any) => v !== undefined).length > 0 
      ) 
    }, 
  }, 
  methods: {
    init() {
      (<HTMLInputElement>this.$refs.explanation).focus();
    }, 
    updateWeight(v: number) {
      this.flow.updateWeight(v)
    }, 
    reset() {
      this.aimNetwork.resetFlowChanges(this.flow)
    }, 
    commit() {
      this.aimNetwork.commitFlowChanges(this.flow) 
    }, 
    create() {
      this.aimNetwork.createFlowOnChain(this.flow) 
    }, 
    flowClick(flow: Flow) {
      this.aimNetwork.selectFlow(flow)
    }, 
    remove() {
      if(!this.confirmRemove) {
        this.confirmRemove = true
      } else {
        this.aimNetwork.removeFlow(this.flow)
      }
    },
    updateExplanation(e: Event) {
      const v = (<HTMLTextAreaElement>e.target).value
      this.flow.updateExplanation(v)
    }, 
  }, 
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.flow-details{
  text-align: center; 
  .aims {
    margin: 1rem; 
  }
  .button {
    &.confirm {
      background-color: @danger; 
    }
    &.aim {
      text-align: left; 
      display: block; 
      margin: 1rem; 
    }
  }
  .relativePositionHint {
    background-color: #0004; 
    margin: 1rem; 
    padding: 0.5rem;
    border-radius: 0.2rem; 
  }
  textarea {
    height: 10em; 
  }
}

</style>
