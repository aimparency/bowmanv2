<template>
  <div 
    @click="click"
    class="connection-status">
    <h4>web3 connection</h4>
    <p v-if="web3Connection.network"> network: {{ web3Connection.network.name }} </p>
    <p v-else class="warning">no connection</p>
    <p v-if="web3Connection.address"> address: {{ address }} </p>
    <p v-else class="warning">no signer</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useWeb3Connection } from "../stores/web3-connection";

export default defineComponent({
  name: "ConnectionStatus",
  props: {
    msg: String,
  },
  computed: {
    connected() {
      return this.web3Connection.network
    }, 
    address() {
      let full = this.web3Connection.address
      return full.slice(0,4) + "..." + full.slice(-4) 
    }
  }, 
  setup() {
    const web3Connection = useWeb3Connection()
    return {
      web3Connection
    }
  },
  methods: {
    click() {
      //TBD do sth maybe
    }
  }
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.connection-status {
  * {
    margin: 0.1rem;
    pointer-events: none; 
  }
  position: fixed; 
  right: 2rem; 
  top: 2rem; 
  text-align: right; 
  background-color: shade(@mid1, 35%);
  opacity: 0.7; 
  padding: 1rem; 
  border-radius: 1rem; 
  &:hover {
    opacity: 1; 
  background-color: @mid1;
    box-shadow: 0 0 2rem #0008; 
  }
  cursor: pointer; 
}
</style>
