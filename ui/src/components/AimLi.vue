<template>
  <div class="aim-li" :class="{faded: aim.title == ''}"> 
    {{ aim.title ?? '<unnamed>' }}
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"

import { Aim } from "../stores/aim-network"

export default defineComponent({
  name: "AimLi",
  components: {
  },
  props: {
    aim: {
      type: Object as PropType<Aim>,
      required: true
    }
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.aim-li{
  .button();
  box-shadow: none; 
  display: block; 
  margin: 0; 
  border-bottom: 0.2rem solid shade(@c1, 70%) ;
  &.faded {
    color: #aaa;
  }
}
</style>
