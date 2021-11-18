<template>
  <div class="row margin-top">
    <!-- 元素 -->
    <draggable
      class="col-2 fixed"
      tag="div"
      :list="items"
      :group="{ name: 'addflow', pull: 'clone', put: false }"
      @end="addNewNode"
      drag-class="ghost"
    >
      <div
        class="component-item no-user-select"
        v-for="item in items"
        :key="item.id"
      >
        {{ item.text }}
      </div>
    </draggable>

    <!-- 画布 -->
    <draggable
      class="col-8 margin-left"
      tag="div"
      :list="list"
      group="addflow"
      draggable=".drag"
      style="
        border-style: solid;
        width: 900px;
        height: 500px;
        overflow: auto;
        background-color: yellow;
      "
    >
      <canvas ref="canvas" height="1000" width="1000"></canvas>
    </draggable>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import { Lassalle } from "../js/addflow.js";
export default {
  name: "AddFlow",
  components: { draggable },

  data() {
    return {
      flow: null,
      config: {
        canDrawNode: false,
      },
      list: [],
      items: [
        {
          id: "001",
          x: 0,
          y: 0,
          w: 80,
          h: 80,
          text: "hello",
          shapeFamily: "polygon",
        },
      ],
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
      node.isContextHandle = true;
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

    //禁止在画布中直接绘制Node
    this.flow.canDrawNode = false;
    this.flow.gridSnap = true;
    this.flow.gridDraw = true;
    this.flow.nodeModel.isContextHandle = true;
    //设置画布填充颜色
    this.flow.fillStyle = "yellow";
    this.flow.mouseSelection = "none";

    //设置节点样式
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

  watch: {},

  computed: {
  },
};
</script>

<style>
.component-item {
  width: 80px;
  height: 80px;
  border-radius: 40px;
  border-color: black;
  border-style: solid;
  text-align: center;
  line-height: 80px;
}
.row {
  display: flex;
  flex-flow: row nowrap;
  width: 100vw;
  height: auto;
}
.col-3 {
  width: 30%;
}
.col-2 {
  width: 20%;
}
.col-7 {
  width: 70%;
}
.col-8 {
  width: 80%;
}
.margin-left {
  position: absolute;
  left: 20vw;
}
.margin-top {
  position: absolute;
  top: 10vh;
}
.ghost {
  background-color: red;
}
</style>