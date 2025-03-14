# Hierarchy Extension for Cocos Creator

这是一个 Cocos Creator 编辑器扩展，用于增强层级面板（Hierarchy Panel）的功能。

## 项目结构

```
source/
├── hierarchy-init.ts    # 核心初始化逻辑
├── main.ts             # 扩展入口点
├── test-extension.ts   # 测试扩展示例
├── utils.ts            # 工具函数
└── types/
    └── index.ts        # 类型定义
```

## 核心功能

1. **层级面板访问与操作**
   - 通过 Shadow DOM 访问 Cocos Creator 编辑器的层级面板
   - 获取并操作面板中的节点数据和 Vue 组件实例
   - 建立节点树结构，维护父子关系

2. **扩展系统**
   - 允许注册自定义扩展，为层级面板节点添加额外功能
   - 支持节点的可见性控制、创建、更新和销毁生命周期
   - 为每个节点创建容器元素，用于放置扩展 UI

3. **事件系统**
   - 支持资源切换、树更新、扩展添加/移除等事件
   - 支持事件优先级和一次性事件
   - 采用发布-订阅模式实现松耦合的组件通信

## 优化内容

1. **数据结构优化**
   - 精简 TreeNode 接口，将不常用属性设为可选
   - 优化事件系统，支持事件优先级和一次性事件
   - 添加扩展优先级机制

2. **性能优化**
   - 使用防抖处理刷新操作，避免短时间内多次刷新
   - 批量处理 DOM 操作，减少重排重绘

3. **日志系统**
   - 实现分级日志系统，支持 DEBUG、INFO、WARN、ERROR 级别
   - 添加时间戳和标签，便于调试和问题定位
   - 可根据环境配置日志级别

4. **错误处理**
   - 增强事件系统的错误处理，避免单个事件错误影响整体功能
   - 使用指数退避策略进行初始化重试，提高成功率

## 使用方法

### 安装扩展

1. 将项目文件复制到 Cocos Creator 扩展目录
2. 在 Cocos Creator 中启用扩展

### 创建自定义扩展

```typescript
// 创建扩展配置
const myExtension = {
    id: 'my-extension',
    className: 'hierarchy-my-extension',
    priority: 10, // 优先级，数值越大越先执行
    
    // 控制扩展对哪些节点可见
    isVisible: (node) => {
        return node.name.startsWith('Player');
    },
    
    // 创建扩展UI
    onCreate: (node, element) => {
        const icon = document.createElement('div');
        icon.className = 'my-icon';
        icon.style.cssText = `
            width: 16px;
            height: 16px;
            background-color: blue;
            position: absolute;
            right: 4px;
            top: 50%;
            transform: translateY(-50%);
        `;
        element.appendChild(icon);
    },
    
    // 清理资源
    onDestroy: () => {
        // 清理代码
    }
};

// 添加扩展
window.hierarchy.extension.add(myExtension);
```

### 监听事件

```typescript
// 监听树更新事件
window.hierarchy.events.on('treeUpdate', () => {
    console.log('节点树已更新');
}, { priority: 5, once: false });

// 监听资源变化事件
window.hierarchy.events.on('assetChange', (assetId, assetType) => {
    console.log(`资源已变化: ${assetType} ${assetId}`);
});
```

## 工具函数

项目提供了一系列实用工具函数：

- **日志控制**：`log`, `setLogLevel`
- **DOM 操作**：`createStyle`, `safeQuerySelector`, `appendChildren`
- **异步处理**：`waitForCondition`, `exponentialRetry`
- **函数增强**：`debounce`, `throttle`

## 注意事项

1. 扩展依赖于 Cocos Creator 编辑器的内部结构，版本更新可能导致兼容性问题
2. 处理大型场景时注意性能影响
3. 避免在扩展中执行耗时操作，可能影响编辑器响应速度 