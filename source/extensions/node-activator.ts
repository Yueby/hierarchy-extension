import { ExtensionOptions, HTMLCustomElement, TreeNode } from '../types';

(function () {
    // 创建扩展配置
    const nodeActivator: ExtensionOptions = {
        id: 'node-activator',
        className: 'hierarchy-node-activator',
        priority: 90,

        isVisible: (node: TreeNode) => {
            return !node.name.startsWith('#h');
        },

        onCreate(node: TreeNode, element: HTMLElement) {
            // 查询复选框
            let checkBox: HTMLCustomElement = element.querySelector('.' + this.className) as HTMLInputElement;
            if (checkBox) {
                checkBox.value = node.active;
            } else {
                // 创建复选框
                checkBox = document.createElement("ui-checkbox");
                checkBox.className = this.className;
                checkBox.value = node.active;
                checkBox.style.cssText = `
                    position: absolute;
                    right: 4px;
                    top: 50%;
                    transform: translateY(-50%);
                    pointer-events: auto;
                    z-index: 999;
                `;
                element.appendChild(checkBox);
            }

            // 阻止事件冒泡
            checkBox.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });

            checkBox.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            const onChange = (e: Event) => {
                e.stopPropagation();
                const value = checkBox.value;

                // 通过 Editor.Message 更新节点激活状态
                Editor.Message.request('scene', 'set-property', {
                    uuid: node.uuid,
                    path: 'active',
                    dump: {
                        type: 'Boolean',
                        value: value
                    }
                });
            };

            // 监听复选框变化
            checkBox.removeEventListener('change', onChange);
            checkBox.addEventListener('change', onChange);
        },

        onUpdate(node: TreeNode, element: HTMLElement) {
            // 更新复选框状态
            const checkBox = element.querySelector('.' + this.className) as any;
            if (checkBox) {
                checkBox.value = node.active;
            }
        },

        onDestroy() {
            // 扩展销毁时的清理工作
        }
    };

    // 添加扩展到hierarchy
    if (window.hierarchy?.extension) {
        try {
            window.hierarchy.extension.add(nodeActivator);
        } catch (error) {
            console.error(`[node-activator]`, '扩展初始化失败:', error);
        }
    } else {
        console.error(`[node-activator]`, '无法初始化扩展: hierarchy未就绪');
    }
})();

