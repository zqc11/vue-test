<template>
  <div>
    <el-row>
      <el-col :span="24">
        <Menu />
      </el-col>
    </el-row>

    <el-row :gutter="10">
      <el-col :span="4" class="margin-10">
        <!-- 元素 -->
        <draggable
          id="components"
          tag="div"
          :list="items"
          :group="{ name: 'addflow', pull: 'clone', put: false}"
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

      <el-col :span="19" class="margin-10">
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
  </div>
</template>

<script>
import draggable from "vuedraggable";
import { Lassalle } from "../js/addflow.js";
import mockdata from "../js/mockData";
import Menu from './Menu.vue'
export default {
  name: "AddFlow",
  components: {
    draggable,
    Menu
  },

  data() {
    return {
      // flow实例对象
      flow: null,
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
      items: mockdata,
    };
  },

  methods: {
    //将新节点添加到flow中
    addNewNode(event) {
      console.log("X坐标：", event.originalEvent.layerX);
      console.log("Y坐标: ", event.originalEvent.layerY);
      let temp = this.list.pop();
      this.node = {
        x: event.originalEvent.layerX - temp.w / 2,
        y: event.originalEvent.layerY - temp.h / 2,
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
    //刷新flow
    refresh() {
      this.flow.refresh();
    },

    //鼠标双击更改node文本信息
    changeText() {
      console.log("dbclick");
      let nodes = this.flow.getSelectedItems();
      if (nodes[0].getIsSelected()) {
        nodes[0].text = "world";
      }
    },
  },

  mounted() {
    //添加鼠标双击node节点监听
    document.addEventListener("dblclick", this.changeText, false);

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
    this.flow.nodeModel.pins = [
      [0, 50],
      [50, 0],
      [100, 50],
      [50, 100],
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
  width: 80vw;
  height: 90vh;
  overflow: auto;
  background-color: yellow;
}
.margin-10 {
  margin: 10px;
}
</style>