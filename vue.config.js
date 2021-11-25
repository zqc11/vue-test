const utils = require('./build/utils');
module.exports = {
  lintOnSave: false,
  publicPath: '/dist/',
  // 文件路径更具自己的实际情况进行配置,我这仅是 demo
  pages:utils.setPages(),
  devServer: {
    open: true, //  npm run serve 自动打开浏览器
    index: 'index.html' //  默认启动页面
  }
}