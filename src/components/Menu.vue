<template>
  <div class="no-user-select">
    <el-row>
      <el-col :span="1">
        <el-button icon="el-icon-refresh-left" size="mini"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button icon="el-icon-refresh-right" size="mini"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button icon="el-icon-refresh" size="mini"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button icon="el-icon-zoom-in" size="mini"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button icon="el-icon-zoom-out" size="mini"></el-button>
      </el-col>
      <el-col :span="4">
        <el-upload
          class="upload-demo"
          action="https://jsonplaceholder.typicode.com/posts/"
          :on-preview="handlePreview"
          :on-remove="handleRemove"
          :before-remove="beforeRemove"
          multiple
          :limit="1"
          :on-exceed="handleExceed"
          :file-list="fileList"
        >
          <el-button size="small" type="primary">点击上传</el-button>
        </el-upload>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: "Menu",
  data() {
    return {};
  },
};
</script>

<style scoped>
#title {
}
</style>