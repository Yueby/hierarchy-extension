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

            const panel = shadowRoot.querySelector('dock-layout > dock-layout:nth-child(5) > dock-groups > dock-panels > panel-frame');
            if (!panel) {
                console.error('未找到 hierarchy panel');
                return null;
            }

            return panel;
        }

        // 节点类
        class TreeNodeInfo {
            name: string;
            element: Element;
            parent: TreeNodeInfo | null;
            children: TreeNodeInfo[];
            paddingLeft: number;

            constructor(element: Element) {
                const dragItem = element.querySelector('.drag-item') as HTMLElement;
                const nameLabel = element.querySelector('.name .label');
                const paddingLeft = dragItem ? parseInt(dragItem.style.paddingLeft) || 0 : 0;

                this.name = nameLabel?.textContent || '';
                this.element = element;
                this.parent = null;
                this.children = [];
                this.paddingLeft = paddingLeft;
            }

            get isExpand(): boolean {
                return this.element.getAttribute('is-expand') === 'true';
            }

            get isSelected(): boolean {
                return this.element.getAttribute('is-selected') === 'true';
            }

            get isParent(): boolean {
                return this.element.getAttribute('is-parent') === 'true';
            }

            get isPrefabNode(): boolean {
                return this.element.getAttribute('is-prefab-node') === '1';
            }

            get isScene(): boolean {
                return this.element.getAttribute('is-scene') === 'true';
            }

            get level(): number {
                return Math.floor(this.paddingLeft / 16);
            }

            get isActive(): boolean {
                return this.element.getAttribute('is-active') === 'true';
            }

            // 展开节点
            expand() {
                if (this.isParent && !this.isExpand) {
                    const arrow = this.element.querySelector('.arrow');
                    if (arrow) {
                        (arrow as HTMLElement).click();
                    }
                }
            }

            // 折叠节点
            collapse() {
                if (this.isParent && this.isExpand) {
                    const arrow = this.element.querySelector('.arrow');
                    if (arrow) {
                        (arrow as HTMLElement).click();
                    }
                }
            }

            // 获取所有子节点（包括孙节点）
            getAllChildren(): TreeNodeInfo[] {
                let result: TreeNodeInfo[] = [];
                this.children.forEach(child => {
                    result.push(child);
                    result = result.concat(child.getAllChildren());
                });
                return result;
            }

            // 获取所有父节点（直到根节点）
            getAllParents(): TreeNodeInfo[] {
                const result: TreeNodeInfo[] = [];
                let current = this.parent;
                while (current) {
                    result.push(current);
                    current = current.parent;
                }
                return result;
            }

            // 检查是否所有子节点都是激活状态
            areAllChildrenActive(): boolean {
                return this.getAllChildren().every(child => child.isActive);
            }

            // 检查是否有任何子节点是激活状态
            hasAnyChildActive(): boolean {
                return this.getAllChildren().some(child => child.isActive);
            }

            // 展开到此节点（展开所有父节点）
            expandToThis() {
                this.getAllParents().forEach(parent => parent.expand());
            }

            // 获取节点的路径（从根节点到当前节点的名称数组）
            getPath(): string[] {
                const path = [...this.getAllParents().reverse().map(node => node.name), this.name];
                return path;
            }

            // 获取节点的完整路径字符串
            getPathString(separator: string = '/'): string {
                return this.getPath().join(separator);
            }
        }

        // 数据层：节点管理
        class HierarchyDataManager {
            private nodes: TreeNodeInfo[] = [];
            private content: Element;
            private tree: Element | null;

            constructor(contentElement: Element) {
                this.content = contentElement;
                this.tree = contentElement.querySelector('.tree');
                this.refreshNodes();
            }

            // 刷新节点数据
            refreshNodes() {
                const treeNodes = this.content.querySelectorAll('.tree-node');
                const nodes = Array.from(treeNodes).map(node => new TreeNodeInfo(node));
                this.nodes = this.buildHierarchy(nodes);
            }

            // 构建节点的父子关系
            private buildHierarchy(nodes: TreeNodeInfo[]) {
                const nodeStack: TreeNodeInfo[] = [];

                nodes.forEach((node, index) => {
                    // 清空之前的父子关系
                    node.parent = null;
                    node.children = [];

                    while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].paddingLeft >= node.paddingLeft) {
                        nodeStack.pop();
                    }

                    if (nodeStack.length > 0) {
                        const parent = nodeStack[nodeStack.length - 1];
                        node.parent = parent;
                        parent.children.push(node);
                    }

                    if (node.isParent) {
                        nodeStack.push(node);
                    }
                });

                return nodes;
            }

            // 获取所有节点信息
            getNodes(): TreeNodeInfo[] {
                return this.nodes;
            }

            // 获取内容元素
            getContentElement(): Element {
                return this.content;
            }
        }

        // 绘制层：UI 管理
        class HierarchyUIManager {
            private dataManager: HierarchyDataManager;

            constructor(dataManager: HierarchyDataManager) {
                this.dataManager = dataManager;
            }

            // 创建或更新节点的复选框
            updateNodeCheckbox(node: Element) {
                let checkbox = node.querySelector('.hierarchy-checkbox');
                if (!checkbox) {
                    checkbox = document.createElement('ui-checkbox');
                    checkbox.className = 'hierarchy-checkbox';
                    checkbox.setAttribute('tabindex', '0');

                    // 设置复选框位置
                    (checkbox as HTMLElement).style.position = 'absolute';
                    (checkbox as HTMLElement).style.right = '4px';
                    (checkbox as HTMLElement).style.zIndex = '999';

                    // 添加值变化监听
                    checkbox.addEventListener('change', (event: Event) => {
                        const target = event.target as HTMLInputElement;
                        const isChecked = target.hasAttribute('checked');
                        const treeNode = target.closest('.tree-node');

                        if (treeNode) {
                            // 更新节点的 is-active 属性
                            if (isChecked) {
                                treeNode.setAttribute('is-active', 'true');
                            } else {
                                treeNode.setAttribute('is-active', 'false');
                            }

                            // 更新数据层
                            this.dataManager.refreshNodes();

                            console.log('Checkbox changed:', {
                                nodeName: treeNode.querySelector('.name .label')?.textContent,
                                isChecked: isChecked
                            });
                        }
                    });

                    node.appendChild(checkbox);
                }

                // 根据 is-active 设置状态
                if (node.getAttribute('is-active') === 'true') {
                    checkbox.setAttribute('checked', '');
                } else {
                    checkbox.removeAttribute('checked');
                }
            }

            // 更新所有节点的 UI
            updateAllNodesUI() {
                const nodes = this.dataManager.getNodes();
                nodes.forEach(node => this.updateNodeCheckbox(node.element));
            }

            // 移除所有 UI 元素
            removeAllUI() {
                // 移除所有复选框
                const nodes = this.dataManager.getNodes();
                nodes.forEach(node => {
                    const checkbox = node.element.querySelector('.hierarchy-checkbox');
                    if (checkbox) {
                        checkbox.remove();
                    }
                });
            }

            // 创建 Vue 应用
            createVueApp(panel: Element) {
                const self = this;
                const app = new Vue({
                    data() {
                        return {
                            treeData: {
                                nodes: self.dataManager.getNodes()
                            }
                        };
                    },
                    methods: {
                        handleSceneReady(uuid: string) {
                            console.log('场景已准备:', uuid);
                            self.dataManager.refreshNodes();
                            self.updateAllNodesUI();
                        },
                        handleReferenceImageShow(uuid: string) {
                            console.log('参考图显示:', uuid);
                            self.dataManager.refreshNodes();
                            self.updateAllNodesUI();
                        },

                        handleSceneChangeNode(uuid: string) {
                            console.log('节点变化:', uuid);
                            self.dataManager.refreshNodes();
                            self.updateAllNodesUI();
                        },
                        destroy() {
                            self.removeAllUI();
                            this.$destroy();
                        }
                    } as any,
                    mounted() {
                        console.log('Vue 应用挂载成功');
                        self.updateAllNodesUI();
                        window.hierarchyApp = this;
                    }
                });

                app.$mount(document.createElement('div')); // 创建一个临时容器
                return app;
            }
        }

        // 创建 Vue 应用的入口函数
        function createHierarchyApp(panel: Element) {
            const contentElement = panel.shadowRoot?.querySelector('div > section.content');
            if (!contentElement) {
                console.error('未找到 content 元素');
                return;
            }

            // 创建数据管理器和 UI 管理器
            const dataManager = new HierarchyDataManager(contentElement);
            const uiManager = new HierarchyUIManager(dataManager);

            // 初始化 UI
            uiManager.updateAllNodesUI();

            // 创建并返回 Vue 应用
            return uiManager.createVueApp(panel);
        }

        // 主逻辑
        const hierarchyPanel = getHierarchyPanel();
        if (hierarchyPanel) {
            // 创建并挂载 Vue 应用
            const app = createHierarchyApp(hierarchyPanel);
            // 保存到全局变量
            window.hierarchyApp = app;
            console.log('Vue 应用创建成功', app);
            
            // 通知主进程Vue应用已准备就绪
            Editor.Message.send('hierarchy-extension', 'hierarchy-app-ready');

        } else {
            console.error('未找到 hierarchy panel');
        }

    } catch (error) {
        console.error('操作失败:', error);
    }

})();

