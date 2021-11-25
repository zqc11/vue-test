<template>
  <div class="no-user-select">
    <el-row :gutter="0.5" type="flex" align="middle" class="align-center">
      <el-col :span="0.5">
        <el-popover
          placement="bottom-start"
          title="撤销"
          width="150"
          trigger="hover"
          content="Ctrl+Z"
        >
          <el-button
            icon="el-icon-refresh-left"
            size="mini"
            @click="undo"
            slot="reference"
          ></el-button>
        </el-popover>
      </el-col>
      <el-col :span="0.5">
        <el-popover
          placement="bottom-start"
          title="重做"
          width="150"
          trigger="hover"
          content="Ctrl+R"
        >
          <el-button
            icon="el-icon-refresh-right"
            size="mini"
            @click="redo"
            slot="reference"
          ></el-button>
        </el-popover>
      </el-col>
      <el-col :span="0.5">
        <el-popover
          placement="bottom-start"
          title="刷新"
          width="150"
          trigger="hover"
          content=""
        >
        <el-button
          icon="el-icon-refresh"
          size="mini"
          @click="refresh"
          slot="reference"
        ></el-button>
        </el-popover>
      </el-col>
      <el-col :span="0.5">
        <el-popover
          placement="bottom-start"
          title="删除"
          width="150"
          trigger="hover"
          content="Delete"
        >
        <el-button
          icon="el-icon-delete"
          size="mini"
          @click="deleteNode"
          slot="reference"
        ></el-button>
        </el-popover>
      </el-col>
      <el-col :span="0.5">
        <el-popover
          placement="bottom-start"
          title="放大"
          width="150"
          trigger="hover"
          content=""
        >
        <el-button
          icon="el-icon-zoom-in"
          size="mini"
          @click="zoomIn"
          slot="reference"
        ></el-button>
        </el-popover>
      </el-col>
      <el-col :span="0.5">
        <el-popover
          placement="bottom-start"
          title="缩小"
          width="150"
          trigger="hover"
          content=""
        >
        <el-button
          icon="el-icon-zoom-out"
          size="mini"
          @click="zoomOut"
          slot="reference"
        ></el-button>
        </el-popover>
      </el-col>
      <el-col :span="1.5">
        <el-upload
          class="upload-demo"
          accept=".json"
          action=""
          :limit="1"
          :file-list="fileList"
          :on-change="upload"
          :auto-upload="false"
          :show-file-list="false"
        >
          <el-button size="small" type="primary">点击上传</el-button>
        </el-upload>
      </el-col>
      <el-col :span="1.5">
        <el-button size="small" type="success" @click="download"
          >点击下载</el-button
        >
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: "Menu",
  data() {
    return {
      fileList: [],
    };
  },
  methods: {
    download() {
      this.$emit("download");
    },
    upload(file, _) {
      console.log("upload");
      this.fileList = [];
      let reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let json = e.target.result;
          this.$emit("upload", json);
        } catch (err) {
          console.log(`load JSON document from file error: ${err.message}`);
          this.fileList = [];
          alert("填充失败，请重新选择文件或手动输入。");
        }
      };
      reader.readAsText(file.raw);
    },
    undo() {
      this.$emit("command", "undo");
    },
    redo() {
      this.$emit("command", "redo");
    },
    refresh() {
      this.$emit("command", "refresh");
    },
    deleteNode() {
      this.$emit("command", "delete");
    },
    zoomIn() {
      this.$emit("command", "zoom-in");
    },
    zoomOut() {
      this.$emit("command", "zoom-out");
    },
  },
};
</script>

<style scoped>
</style>