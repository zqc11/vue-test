<template>
  <div>
    <Menu />
    <AddFlow />
  </div>
</template>

<script>
//引入组件
import AddFlow from "./components/AddFlow.vue";
import Menu from "./components/Menu.vue";
export default {
  name: "App",
  components: {
    AddFlow,
    Menu,
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

.btn {
  background-color: darkred;
  color: white;
}

.fixed {
  position: fixed;
  z-index: 100;
}

.no-user-select {
  user-select: none;
}
</style>