<template>
  <div class="back"
    tabindes="0"
    @click.stop="$emit('click')">
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
  name: "BackButton",
  emits: ['click'],
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@size: 3rem; 
.back{
  .button();
  margin:0; 
  padding: 0; 
  left: 1rem;
  top: 1rem; 
  width: @size; 
  height: @size; 
  border-radius: @secondaryradius; 
  line-height: @size; 
  font-weight: bold; 
  text-align: center; 
  position: absolute; 
  background-image: url(../../assets/main-menu.svg); 
  background-repeat: no-repeat; 
  background-position: center; 
  background-size: 65%; 
}
</style>
