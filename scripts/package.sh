#!/bin/bash

# 清理并构建
pnpm clear
pnpm build

# 获取包名和版本
NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")

# 创建zip文件
cd dist
zip -r "${NAME}-${VERSION}.zip" "${NAME}"
mv "${NAME}-${VERSION}.zip" ../

echo "Package created: ${NAME}-${VERSION}.zip" 