import Vue from 'vue';
import Login from './Login.vue';

//关闭生产提示
Vue.config.productionTip = false
new Vue({
    el: "#login",
    render: h => h(Login)
});