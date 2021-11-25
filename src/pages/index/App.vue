<template>
  <div>
    <a href="./login.html">登录</a>
    <header-1 style="margin-bottom:10px"></header-1>
    <AddFlow />
    <footer-1></footer-1>
  </div>
</template>

<script>
//引入组件
import AddFlow from "./components/AddFlow.vue";
import Footer1 from '../../components/Footer1.vue';
import Header1 from '../../components/Header1.vue';
export default {
  name: "App",
  components: {
    AddFlow,
    Header1,
    Footer1
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
  display: block;
}

body {
  overflow-x: hidden;
}

.no-user-select {
  user-select: none;
}
.align-center {
  align-items: center;
}
</style>