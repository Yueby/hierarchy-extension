import { ExtensionOptions, TreeNode } from '../types';

(function () {
    const headerNodeExtension: ExtensionOptions = {
        id: 'header-node',
        className: 'hierarchy-header-node',
        priority: 0,

        isVisible(node: TreeNode) {
            return node.name.startsWith('#h');
        },

        onCreate(node: TreeNode, element: HTMLElement) {
            // 获取父元素的padding-left
            const dragItem = element.closest('ui-drag-item');
            const paddingLeft = dragItem ? window.getComputedStyle(dragItem).paddingLeft : '0px';

            // 生成唯一的headerbar id
            const headerId = `${this.id}`;

            // 查找是否已存在
            let headerBar = element.querySelector('#' + headerId) as HTMLElement;
            if (headerBar) {
                return;
            }

            // 创建标题栏容器
            headerBar = document.createElement('div');
            headerBar.id = headerId;
            headerBar.className = this.className;
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
            element.appendChild(headerBar);
        },

        onUpdate(node: TreeNode, element: HTMLElement) {
            const headerId = `header-${node.uuid}`;
            const headerBar = element.querySelector('#' + headerId) as HTMLElement;
            if (headerBar) {
                const titleText = headerBar.querySelector('span');
                if (titleText) {
                    titleText.textContent = node.name.substring(2);
                }

                // 更新padding-left
                const dragItem = element.closest('ui-drag-item');
                const paddingLeft = dragItem ? window.getComputedStyle(dragItem).paddingLeft : '0px';
                headerBar.style.left = paddingLeft;
                headerBar.style.width = `calc(100% - ${paddingLeft})`;
            }
        }
    };

    // 注册扩展
    window.hierarchy?.extension?.add(headerNodeExtension);
})(); 