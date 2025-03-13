// 该脚本只能使用require，不可以impoort
try {
    const { nodeTree } = require('./nodeTree');
    console.log(nodeTree);
} catch (error) {
    console.error(error);
}