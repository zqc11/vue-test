const glob = require("glob");
const path = require("path");
const PAGE_PATH = path.resolve(__dirname, '../src/pages');
const merge = (a,b)=>{
    return Object.assign(a,b);
}
// pages 多入口配置
exports.setPages = configs => {
    let entryFiles = glob.sync(PAGE_PATH + '/*/*.js')
    let map = {}

    entryFiles.forEach(filePath => {
        let filename = filePath.substring(filePath.lastIndexOf('/') + 1, filePath.lastIndexOf('.'))
        let tmp = filePath.substring(0, filePath.lastIndexOf('/'))
        let conf = {
            // page 的入口
            entry: filePath,
            // 模板来源
            template: tmp + "/" + filename + '.html',
            // 在 dist/index.html 的输出
            filename: filename + '.html',
            // 页面模板需要加对应的js脚本，如果不加这行则每个页面都会引入所有的js脚本
            chunks: ['chunk-vendors', 'chunk-common', filename],
            inject: true,
        };

        if (configs) {
            conf = merge(conf, configs)
        }

        if (process.env.NODE_ENV === 'production') {
            conf = merge(conf, {
                minify: {
                    removeComments: true, // 删除 html 中的注释代码
                    collapseWhitespace: true, // 删除 html 中的空白符
                    // removeAttributeQuotes: true // 删除 html 元素中属性的引号
                },
                chunksSortMode: 'manual' // 按 manual 的顺序引入
            })
        }

        map[filename] = conf
    })

    return map
}