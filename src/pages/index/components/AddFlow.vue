/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-vars */
<template>
  <div>
    <!-- 操作栏 -->
    <Menu @download="download" @upload="upload" @command="command" ref="menu" />
    <el-divider></el-divider>
    <el-row :gutter="10" justify="center" type="flex" class="margin-10">
      <el-col :span="4">
        <!-- 元素 -->
        <draggable
          id="components"
          tag="div"
          :list="elements"
          :group="{ name: 'addflow', pull: 'clone', put: false }"
          :move="moveNode"
          @end="addNewNode"
          drag-class="ghost"
          :sort="false"
        >
          <!-- 展示元素 -->
          <div
            class="component-item no-user-select"
            v-for="item in elements"
            :key="item.id"
          >
            <img :src="item.img" :alt="item.shapeFamily" style="width: 80px" />
          </div>
        </draggable>
      </el-col>

      <el-col :span="20">
        <!-- 画布 -->
        <draggable
          id="canvas-wrapper"
          tag="div"
          :list="list"
          group="addflow"
          draggable=".drag"
        >
          <canvas ref="canvas" height="800" width="800"></canvas>
        </draggable>
      </el-col>
    </el-row>

    <!-- 节点信息Dialog -->
    <drawer-box :flow="flow" ref="drawer" />
  </div>
</template>

<script>
import draggable from "vuedraggable";
import Menu from "./Menu.vue";
import { Lassalle } from "../../../js/addflow.js";
import elements from "../../../js/mockData";
import JSONFlow from "../../../js/jsonflow.js";
import DrawerBox from "./DrawerBox.vue";
export default {
  name: "AddFlow",
  components: {
    draggable,
    Menu,
    DrawerBox,
  },

  data() {
    return {
      // flow实例对象
      flow: null,
      // 节点信息框显示标志位
      dialog: false,
      // 当前被选中的Node
      selectedNode: {
        text: "",
      },
      // flow配置
      config: {
        canDrawNode: false,
        gridSnap: false,
        gridDraw: false,
        fillStyle: "black",
      },
      // 用来接收元素
      list: [],
      // 元素列表
      elements: elements,
      // 所有的节点
      nodes: [
        {
          node: {},
          id: "",
          checher: "",
        },
      ],
    };
  },

  methods: {
    //将新节点添加到flow中
    addNewNode(event) {
      let temp = this.list.pop();
      temp.x = event.originalEvent.layerX / this.flow.zoom - temp.w / 2;
      temp.y = event.originalEvent.layerY / this.flow.zoom - temp.h / 2;
      this.flow.beginUpdate();
      let node = this.flow.addNode(temp.x, temp.y, temp.w, temp.h, temp.text);
      if (temp.polygon) {
        node.polygon = temp.polygon;
      }
      node.shapeFamily = temp.shapeFamily;
      this.flow.endUpdate();
      this.updateNodes();
    },

    // 节点移动过程中
    moveNode(source, event) {
      let item = source.draggedContext.element;
      let x = event.layerX / this.flow.zoom - item.w / 2;
      let y = event.layerY / this.flow.zoom - item.h / 2;
      for (let node of this.nodes) {
        if (node.x == x) {
          console.log(x);
          return;
        }
        if (node.y == y) {
          console.log(y);
          return;
        }
      }
    },

    // 更新nodes
    updateNodes() {
      console.log("node");
      let items = this.flow.getItems();
      this.nodes = [];
      for (let item of items) {
        if (this.flow.isNode(item)) {
          this.nodes.push(item);
        }
      }
    },

    //鼠标双击更改node文本信息
    showInfo() {
      this.$refs.drawer.showInfo();
    },
    // 将flow下载成json文件
    download() {
      let json = JSONFlow.toJSON(this.flow);
      var a = document.createElement("a");
      var file = new Blob([json], { type: "text/plain" });
      a.href = URL.createObjectURL(file);
      a.download = "addflow.json";
      a.click();
    },
    // 从json文件中加载flow
    upload(json) {
      this.flow.clear();
      JSONFlow.fromJSON(this.flow, json);
    },
    // 工具栏操作
    command(type) {
      if (type === "undo") {
        this.flow.taskManager.undo();
      }
      if (type === "redo") {
        this.flow.taskManager.redo();
      }
      if (type === "refresh") {
        this.flow.zoom = 1;
        this.flow.refresh();
      }
      if (type === "delete") {
        this.flow.deleteSel();
      }
      if (type === "zoom-in") {
        this.flow.unselectAll();
        this.flow.zoom += 0.1;
        this.flow.refresh();
      }
      if (type === "zoom-out") {
        this.flow.unselectAll();
        this.flow.zoom -= 0.1;
        this.flow.refresh();
      }
    },
    // 鼠标滚轮事件
    scroll(e) {
      if (e.button === 1) {
        console.log(e);
        console.log("中键按下");
      }
    },
  },

  created() {
    // 添加Ctrl+z快捷键
    this.$shortcut.bind("ctrl+z", (_) => {
      this.command("undo");
    });
    // 添加Ctrl+r快捷键
    this.$shortcut.bind("ctrl+r", (_) => {
      this.command("redo");
    });
    // 添加Delete快捷键
    this.$shortcut.bind("delete", (_) => {
      this.command("delete");
    });
    // 添加鼠标双击node节点监听
    document.addEventListener("dblclick", this.showInfo, false);
    document.onmousedown = this.scroll;
    document.onmousemove = (e) => {
      if (e.button === 1) {
        console.log(e);
      }
    };
  },

  mounted() {
    const canvas = this.$refs.canvas;
    this.flow = new Lassalle.Flow(canvas);

    // 设置画布
    this.flow.canDrawNode = false; //禁止在画布中直接绘制Node
    this.flow.gridSnap = true; // 网格吸附
    this.flow.gridDraw = false; // 显示网格
    this.flow.gridSizeX = 10; // 网格大小
    this.flow.gridSizeY = 10; // 网格大小
    // this.flow.fillStyle = "yellow"; //设置画布填充颜色
    this.flow.mouseSelection = "selection"; // 设置鼠标动作方式

    //设置节点样式
    this.flow.nodeModel.isContextHandle = false; // 右上角句柄
    this.flow.nodeModel.strokeStyle = "black";
    this.flow.nodeModel.textFillStyle = "black";
    this.flow.nodeModel.lineWidth = 2;
    this.flow.nodeModel.textLineHeight = 15;
    this.flow.pinSize = 10; //控制节点的大小
    this.flow.nodeModel.pins = [
      [0, 25],
      [0, 50],
      [0, 75],
      [25, 0],
      [50, 0],
      [75, 0],
      [100, 25],
      [100, 50],
      [100, 75],
      [25, 100],
      [50, 100],
      [75, 100],
    ];

    //设置线条类型
    this.flow.linkModel.strokeStyle = "black";
    this.flow.linkModel.textFillStyle = "black";
    this.flow.linkModel.lineStyle = "orthogonal";
    this.flow.linkModel.lineWidth = 2;
    this.flow.linkModel.isShadowed = true; // 是否有阴影

    this.flow.refresh();
  },
};
</script>

<style scoped>
#components {
  height: 80vh;
  width: 100%;
  display: flex;
  flex-flow: row wrap;
  overflow: auto;
  justify-content: center;
  border-style: solid;
}
.component-item {
  width: 80px;
  height: 80px;
  border-color: black;
  border-style: solid;
  text-align: center;
  line-height: 80px;
  margin: 10px;
}
.ghost {
  background-color: red;
}
#canvas-wrapper {
  border-style: solid;
  width: 100%;
  height: 80vh;
  overflow: auto;
}
.margin-10 {
  margin-top: 10px;
}
</style>