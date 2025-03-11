const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// 清理并构建
console.log('Cleaning and building...');
execSync('pnpm clear', { stdio: 'inherit' });
execSync('pnpm build', { stdio: 'inherit' });

// 获取包信息
const packageJson = require('../package.json');
const { name, version } = packageJson;

// 创建输出流
const output = fs.createWriteStream(path.join(__dirname, `../${name}-${version}.zip`));
const archive = archiver('zip', {
    zlib: { level: 9 } // 设置压缩级别
});

// 监听完成事件
output.on('close', () => {
    console.log(`Package created: ${name}-${version}.zip`);
    console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

// 监听错误
archive.on('error', (err) => {
    throw err;
});

// 将输出流连接到归档
archive.pipe(output);

// 添加文件到压缩包
archive.directory(path.join(__dirname, '../dist', name), name);

// 完成打包
archive.finalize(); 