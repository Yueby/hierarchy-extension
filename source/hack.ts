// 该脚本只能使用require，不可以impoort
(() => {
    try {
        const fs = require('fs');
        const path = require('path');
        const Vue = require('vue');

        // 获取 dock 的 shadowRoot
        function getDockShadowRoot() {
            const dockFrame = document.querySelector('#dock');
            if (!dockFrame) {
                console.error('未找到 #dock');
                return null;
            }

            const shadowRoot = dockFrame.shadowRoot;
            if (!shadowRoot) {
                console.error('未找到 shadowRoot');
                return null;
            }

            return shadowRoot;
        }

        // 获取层级面板
        function getHierarchyPanel() {
            const shadowRoot = getDockShadowRoot();
            if (!shadowRoot) return null;

            const dockLayouts = shadowRoot.querySelectorAll('dock-layout > dock-layout');
            for (let i = 0; i < dockLayouts.length; i++) {
                const layout = dockLayouts[i];
                const panel = layout.querySelector('dock-groups > dock-panels > panel-frame[name="hierarchy"]');
                if (panel) return panel;
            }
            return null;
        }

        // 创建 Vue 应用
        function createHierarchyApp(panel: Element) {
            // 创建容器元素
            const container = document.createElement('div');
            container.id = 'hierarchy-extension';
            container.style.cssText = 'position: absolute; top: 0; right: 0; z-index: 999;';
            panel.appendChild(container);

            // 创建 Vue 应用
            const app = new Vue({
                data() {
                    return {
                        message: 'Hello Hierarchy!',
                        buttons: [
                            { id: 'btn1', label: '按钮1' },
                            { id: 'btn2', label: '按钮2' }
                        ]
                    };
                },
                template: `
                    <div class="hierarchy-extension-container">
                        <div class="button-group">
                            <button 
                                v-for="btn in buttons" 
                                :key="btn.id"
                                @click="handleClick(btn.id)"
                                class="hierarchy-btn"
                            >
                                {{ btn.label }}
                            </button>
                        </div>
                    </div>
                `,
                methods: {
                    handleClick(btnId: string) {
                        console.log('按钮点击:', btnId);
                    },
                    handleSceneChangeNode(uuid: string) {
                        console.log('节点变化:', uuid);
                    }
                },
                mounted() {
                    console.log('Vue 应用挂载成功');
                    window.hierarchyApp = this;
                }
            });

            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .hierarchy-extension-container {
                    padding: 4px;
                    background: var(--color-normal-fill);
                }
                .button-group {
                    display: flex;
                    gap: 4px;
                }
                .hierarchy-btn {
                    padding: 2px 8px;
                    border: 1px solid var(--color-normal-border);
                    background: var(--color-normal-fill);
                    color: var(--color-normal-contrast);
                    border-radius: 2px;
                    cursor: pointer;
                }
                .hierarchy-btn:hover {
                    background: var(--color-hover-fill);
                }
            `;
            container.appendChild(style);

            // 挂载应用
            app.$mount(container);

            return app;
        }

        // 主逻辑
        const hierarchyPanel = getHierarchyPanel();
        if (hierarchyPanel) {
            // 创建并挂载 Vue 应用
            const app = createHierarchyApp(hierarchyPanel);
            // 保存到全局变量

            window.hierarchyApp = app;

            console.log('Vue 应用创建成功', app);

        } else {
            console.error('未找到 hierarchy panel');
        }

    } catch (error) {
        console.error('操作失败:', error);
    }

})();

