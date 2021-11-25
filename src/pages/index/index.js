import Vue from 'vue';
import App from './App';
import '../../js/shortcut.js';
import {
    Row,
    Col,
    Button,
    Drawer,
    Form,
    FormItem,
    Input,
    Upload,
    Tabs,
    TabPane,
    Menu,
    Submenu,
    MenuItem,
    Popover,
    Divider,
} from "element-ui"
import 'element-ui/lib/theme-chalk/index.css'

Vue.component(Row.name, Row);
Vue.component(Col.name, Col);
Vue.component(Button.name, Button);
Vue.component(Drawer.name, Drawer);
Vue.component(Form.name, Form);
Vue.component(FormItem.name, FormItem);
Vue.component(Input.name, Input);
Vue.component(Upload.name, Upload);
Vue.component(Tabs.name, Tabs);
Vue.component(TabPane.name, TabPane);
Vue.component(Menu.name, Menu);
Vue.component(Submenu.name, Submenu);
Vue.component(MenuItem.name, MenuItem);
Vue.component(Popover.name, Popover);
Vue.component(Divider.name, Divider);

//关闭生产提示
Vue.config.productionTip = false
new Vue({
    el: "#root",
    render: h => h(App)
});