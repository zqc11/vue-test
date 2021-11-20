/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-vars */
<template>
  <div>
    <!-- 操作栏 -->
    <el-row>
      <el-col :span="24">
        <Menu @download="download" @upload="upload" @command="command" />
      </el-col>
    </el-row>

    <el-row :gutter="10" justify="space-around" type="flex" class="margin-10">
      <el-col :span="4">
        <!-- 元素 -->
        <draggable
          id="components"
          tag="div"
          :list="items"
          :group="{ name: 'addflow', pull: 'clone', put: false }"
          @end="addNewNode"
          drag-class="ghost"
        >
          <!-- 展示元素 -->
          <div
            class="component-item no-user-select"
            v-for="item in items"
            :key="item.id"
          >
            {{ item.text }}
          </div>
        </draggable>
      </el-col>

      <el-col :span="19">
        <!-- 画布 -->
        <draggable
          id="canvas-wrapper"
          tag="div"
          :list="list"
          group="addflow"
          draggable=".drag"
        >
          <canvas ref="canvas" height="1000" width="1000"></canvas>
        </draggable>
      </el-col>
    </el-row>

    <!-- 节点信息Dialog -->
    <el-drawer
      title="详细信息"
      :before-close="handleClose"
      :visible.sync="dialog"
      direction="rtl"
      custom-class="demo-drawer"
      class="no-user-select"
    >
      <el-form :model="selectedNode" label-width="80px" @submit.native.prevent>
        <el-form-item label="活动名称">
          <el-input
            v-model="selectedNode.text"
            @keydown.enter.native="handleClose"
            ref="title"
          ></el-input>
        </el-form-item>
      </el-form>
    </el-drawer>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import Menu from "./Menu.vue";
import { Lassalle } from "../js/addflow.js";
import items from "../js/mockData";
import JSONFlow from "../js/jsonflow.js";
export default {
  name: "AddFlow",
  components: {
    draggable,
    Menu,
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
      items: items,
    };
  },

  methods: {
    //将新节点添加到flow中
    addNewNode(event) {
      let temp = this.list.pop();
      this.node = {
        x: event.originalEvent.layerX / this.flow.zoom - temp.w / 2,
        y: event.originalEvent.layerY / this.flow.zoom - temp.h / 2,
        h: temp.h,
        w: temp.w,
        text: temp.text,
        shapeFamily: temp.shapeFamily,
      };
      this.flow.beginUpdate();
      let node = this.flow.addNode(
        this.node.x,
        this.node.y,
        this.node.w,
        this.node.h,
        this.node.text
      );
      node.shapeFamily = this.node.shapeFamily;
      this.flow.endUpdate();
    },

    //鼠标双击更改node文本信息
    showInfo() {
      // 自动聚焦到title上
      setTimeout(() => {
        this.$nextTick(() => {
          this.$refs.title.focus();
        });
      }, 100);
      let temp = this.getSelectedNode();
      if (temp === undefined) {
        return;
      }
      this.selectedNode = temp;
      this.dialog = true;
    },
    getSelectedNode() {
      if (this.flow !== null) {
        return this.flow.getSelectedItems()[0];
      }
    },
    handleClose() {
      this.dialog = false;
      this.flow.refresh();
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
  },

  mounted() {
    // 添加鼠标双击node节点监听
    document.addEventListener("dblclick", this.showInfo, false);
    const canvas = this.$refs.canvas;
    this.flow = new Lassalle.Flow(canvas);

    // 设置画布
    this.flow.canDrawNode = false; //禁止在画布中直接绘制Node
    this.flow.gridSnap = false; // 网格吸附
    this.flow.gridDraw = false; // 显示网格
    this.flow.fillStyle = "yellow"; //设置画布填充颜色
    this.flow.mouseSelection = "none";

    //设置节点样式
    this.flow.nodeModel.isContextHandle = false; // 右上角句柄
    this.flow.nodeModel.strokeStyle = "black";
    this.flow.nodeModel.textFillStyle = "black";
    this.flow.nodeModel.lineWidth = 2;
    this.flow.nodeModel.textLineHeight = 15;
    this.flow.pinSize = 5; //控制节点的大小
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
    this.flow.linkModel.isShadowed = true;

    this.flow.refresh();
  },
};
</script>

<style scoped>
#components {
  height: 90vh;
  display: flex;
  flex-flow: row wrap;
  overflow: auto;
  border-style: solid;
  background: greenyellow;
}
.component-item {
  width: 60px;
  height: 60px;
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
  height: 90vh;
  overflow: auto;
  background-color: yellow;
}
.margin-10 {
  margin-top: 10px;
}
</style>