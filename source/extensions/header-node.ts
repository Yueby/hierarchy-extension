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

            // 先检查是否已存在
            const existingBars = element.getElementsByClassName(this.className);
            window.utils.log(window.utils.LogLevel.DEBUG, 'HeaderNode', '查找现有标题栏:', {
                nodeName: node.name,
                existingBars: existingBars.length,
                elementChildren: element.children.length,
                elementHTML: element.innerHTML
            });

            if (existingBars.length > 0) {
                window.utils.log(window.utils.LogLevel.DEBUG, 'HeaderNode', '找到现有标题栏，跳过创建');
                return;
            }

            // 创建标题栏容器
            const headerBar = document.createElement('div');
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
            
            window.utils.log(window.utils.LogLevel.DEBUG, 'HeaderNode', '创建新标题栏完成:', {
                nodeName: node.name,
                headerBarHTML: headerBar.outerHTML
            });
        },

        onUpdate(node: TreeNode, element: HTMLElement) {
            const existingBars = element.getElementsByClassName(this.className);
            if (existingBars.length > 0) {
                const headerBar = existingBars[0] as HTMLElement;
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