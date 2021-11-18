import Vue from 'vue';
import App from './App';
import ElementUI from "element-ui"
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(ElementUI);
//关闭生产提示
Vue.config.productionTip = false
new Vue({
    el: "#root",
    render: h=>h(App)
});