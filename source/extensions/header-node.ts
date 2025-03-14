import { ExtensionOptions, TreeNode } from '../types';

(function () {
    const headerNodeExtension: ExtensionOptions = {
        id: 'header-node',
        className: 'hierarchy-header-node',
        priority: 100,

        isVisible(node: TreeNode) {
            return node.name.startsWith('#h');
        },

        onCreate(node: TreeNode, container: HTMLElement) {
            // 获取父元素的padding-left
            const dragItem = container.closest('ui-drag-item');
            const paddingLeft = dragItem ? window.getComputedStyle(dragItem).paddingLeft : '0px';

            // 创建标题栏容器
            const headerBar = document.createElement('div');
            headerBar.style.cssText = `
                position: absolute;
                left: ${paddingLeft};
                top: 0;
                width: calc(100% - ${paddingLeft});
                height: 100%;
                background-color: #3f3f3f;
                pointer-events: none;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // 创建标题文本
            const titleText = document.createElement('span');
            titleText.style.cssText = `
                color: #ffffff;
                font-weight: bold;
                font-size: 12px;
                pointer-events: none;
                user-select: none;
            `;
            
            // 移除#h前缀并设置文本
            titleText.textContent = node.name.substring(2);

            // 组装DOM
            headerBar.appendChild(titleText);
            container.appendChild(headerBar);
        },
    };

    // 注册扩展
    window.hierarchy?.extension?.add(headerNodeExtension);
})(); 