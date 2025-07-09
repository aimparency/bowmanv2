<template>
  <Map/>
  <ConnectionStatus/>
  <SideBar/>
  <Log/>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { useAimNetwork } from "./stores/aim-network"
import { useWeb3Connection } from "./stores/web3-connection";
import { useUi } from "./stores/ui";

import ConnectionStatus from "./components/ConnectionStatus.vue";
import Map from "./components/Map.vue";
import SideBar from "./components/SideBar.vue";
import Log from "./components/Log.vue";

export default defineComponent({
  name: "App",
  components: {
    ConnectionStatus, 
    Map,
    SideBar,
    Log
  },
  data() {
    return {
      web3Connection: useWeb3Connection(),
      aimNetwork: useAimNetwork(),
      ui: useUi(),
    }
  },
  mounted() {
    this.web3Connection.connect(() => {
        this.aimNetwork.loadInitial()
    }) 
    const onResize = () => {
      this.ui.setScreenSize(
        window.innerWidth, 
        window.innerHeight
      )
    }
    window.addEventListener('resize', onResize)
    onResize()
    window.addEventListener("beforeunload", (e) => {
      if(this.aimNetwork.allChanges.length > 0) {
        e.preventDefault()
        this.ui.promtOnExit()
        this.aimNetwork.deselect()
        e.returnValue = "There are uncommmitted changes, that will be lost if you leave this page."
        return "There are uncommmitted changes, that will be lost if you leave this page."
      }
      return null
    }, true);
  }, 
  methods: {
  },
});
</script>
<style lang="less">
/* {
  outline: 1px solid #4f35; 
} /**/

* {
  color: white; 
  font-family: sans-serif; 
}

input, textarea {
  font-size: 1rem; 
  width: calc(100% - 2rem); 
  padding: 0.5rem; 
  border: none; 
  border-radius: @secondaryradius; 
  box-sizing: border-box; 
  &:focus {
    outline: 0.2rem solid #fff8; 
  }
  background-color: #0004; 
}

.sidebar-heading {
  text-align: center; 
  line-height: 2rem; 
  padding: 0.5rem 1rem; 
  margin: 0; 
  margin-bottom: 0.5rem; 
  background-color: @mid2; 
}

div.scrollspace {
  height: 5rem;
}

::-webkit-scrollbar {
    width: 0.5em;
    z-index: 1; 
}

::-webkit-scrollbar-thumb {
    background: #fff4;
    border-radius: 0.25rem;
    box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.75);
}

div.spinner{
  @border: 0.5rem solid @c1; 
  display: inline-block; 
  border: 0.5rem solid #8880; 
  border-radius: 50%;
  width: 2.5em;
  height: 2.5em;
  margin: 0.425rem 0.2rem; 
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
} 

p {
  margin: 1rem; 
}

h3 {
  margin: 1rem auto; 
  padding-top: 2rem; 
}

h2 {
  line-height: 2rem; 
  margin: 1.5rem auto ; 
}

.nowrap {
  white-space: nowrap; 
}

/* overlay loading animation */
.block {
  position: relative; 
  .overlay {
    animation: loading 2s ease infinite; 
    position: absolute;
    left: 0.5rem; 
    top: -0.5rem; 
    border-radius: 0.5rem; 
    width: calc(100% - 1rem); 
    height: calc(100% + 1rem);
    background: linear-gradient(100deg, fade(@c2, 10%), #fff6);
    background-size: 200% 100%;
    opacity: 1; 
    transition: opacity 0.2s ease-in-out;
    &.deactivated {
      opacity: 0; 
      pointer-events: none;
    }
  }
}
@keyframes loading {
  0% {
    background-position: 0% 0%; 
  }
  100% {
    background-position: -200% 0%; 
  }
}

.hint{
  color: @c1; 
}

</style>
