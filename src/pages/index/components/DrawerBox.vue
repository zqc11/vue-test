<template>
  <div>
    <!-- 节点信息Dialog -->
    <el-drawer
      title="详细信息"
      :before-close="handleClose"
      :visible.sync="dialog"
      direction="rtl"
      class="no-user-select"
    >
      <el-tabs type="border-card">
        <el-tab-pane label="用户管理">
          <el-form
            :model="selectedNode"
            label-width="80px"
            @submit.native.prevent
          >
            <el-form-item label="ID">
              <el-input
                v-model="selectedNode.text"
                @keydown.enter.native="handleClose"
                ref="title"
              ></el-input>
            </el-form-item>
            <el-form-item label="活动名称">
              <el-input
                v-model="selectedNode.text"
                @keydown.enter.native="handleClose"
                ref="title"
              ></el-input>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="配置管理">配置管理</el-tab-pane>
        <el-tab-pane label="角色管理">角色管理</el-tab-pane>
        <el-tab-pane label="定时任务补偿">定时任务补偿</el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>

<script>
export default {
  name: "DrawerBox",
  props: ["flow"],
  data() {
    return {
      dialog: false,
      selectedNode: {},
    };
  },
  methods: {
    handleClose() {
      this.dialog = false;
      this.flow.refresh();
    },
    showInfo() {
      // 自动聚焦到title上
      setTimeout(() => {
        this.$nextTick(() => {
          this.$refs.title.focus();
        });
      }, 600);
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
  },
};
</script>

<style>
</style>