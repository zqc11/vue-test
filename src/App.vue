<template>
  <div>
    <AddFlow />
  </div>
</template>

<script>
//引入组件
import AddFlow from "./components/AddFlow.vue";
export default {
  name: "App",
  components: {
    AddFlow,
  },
  data() {
    return {};
  },
  methods: {},
  watch: {},
};
</script>

<style>
body,
h1,
h2,
h3 {
  margin: 0px;
  padding: 0px;
}

body {
  overflow: hidden;
}

.no-user-select {
  user-select: none;
}
</style>