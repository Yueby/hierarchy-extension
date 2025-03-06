"use strict";
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
            if (!shadowRoot)
                return null;
            const panel = shadowRoot.querySelector('dock-layout > dock-layout:nth-child(5) > dock-groups > dock-panels > panel-frame');
            if (!panel) {
                console.error('未找到 hierarchy panel');
                return null;
            }
            return panel;
        }
        // 节点类
        class TreeNodeInfo {
            constructor(element) {
                const dragItem = element.querySelector('.drag-item');
                const nameLabel = element.querySelector('.name .label');
                const paddingLeft = dragItem ? parseInt(dragItem.style.paddingLeft) || 0 : 0;
                this.name = (nameLabel === null || nameLabel === void 0 ? void 0 : nameLabel.textContent) || '';
                this.element = element;
                this.parent = null;
                this.children = [];
                this.paddingLeft = paddingLeft;
            }
            get isExpand() {
                return this.element.getAttribute('is-expand') === 'true';
            }
            get isSelected() {
                return this.element.getAttribute('is-selected') === 'true';
            }
            get isParent() {
                return this.element.getAttribute('is-parent') === 'true';
            }
            get isPrefabNode() {
                return this.element.getAttribute('is-prefab-node') === '1';
            }
            get isScene() {
                return this.element.getAttribute('is-scene') === 'true';
            }
            get level() {
                return Math.floor(this.paddingLeft / 16);
            }
            get isActive() {
                return this.element.getAttribute('is-active') === 'true';
            }
            // 展开节点
            expand() {
                if (this.isParent && !this.isExpand) {
                    const arrow = this.element.querySelector('.arrow');
                    if (arrow) {
                        arrow.click();
                    }
                }
            }
            // 折叠节点
            collapse() {
                if (this.isParent && this.isExpand) {
                    const arrow = this.element.querySelector('.arrow');
                    if (arrow) {
                        arrow.click();
                    }
                }
            }
            // 获取所有子节点（包括孙节点）
            getAllChildren() {
                let result = [];
                this.children.forEach(child => {
                    result.push(child);
                    result = result.concat(child.getAllChildren());
                });
                return result;
            }
            // 获取所有父节点（直到根节点）
            getAllParents() {
                const result = [];
                let current = this.parent;
                while (current) {
                    result.push(current);
                    current = current.parent;
                }
                return result;
            }
            // 检查是否所有子节点都是激活状态
            areAllChildrenActive() {
                return this.getAllChildren().every(child => child.isActive);
            }
            // 检查是否有任何子节点是激活状态
            hasAnyChildActive() {
                return this.getAllChildren().some(child => child.isActive);
            }
            // 展开到此节点（展开所有父节点）
            expandToThis() {
                this.getAllParents().forEach(parent => parent.expand());
            }
            // 获取节点的路径（从根节点到当前节点的名称数组）
            getPath() {
                const path = [...this.getAllParents().reverse().map(node => node.name), this.name];
                return path;
            }
            // 获取节点的完整路径字符串
            getPathString(separator = '/') {
                return this.getPath().join(separator);
            }
        }
        // 数据层：节点管理
        class HierarchyDataManager {
            constructor(contentElement) {
                this.nodes = [];
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
            buildHierarchy(nodes) {
                const nodeStack = [];
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
            getNodes() {
                return this.nodes;
            }
            // 获取内容元素
            getContentElement() {
                return this.content;
            }
        }
        // 绘制层：UI 管理
        class HierarchyUIManager {
            constructor(dataManager) {
                this.dataManager = dataManager;
            }
            // 创建或更新节点的复选框
            updateNodeCheckbox(node) {
                let checkbox = node.querySelector('.hierarchy-checkbox');
                if (!checkbox) {
                    checkbox = document.createElement('ui-checkbox');
                    checkbox.className = 'hierarchy-checkbox';
                    checkbox.setAttribute('tabindex', '0');
                    // 设置复选框位置
                    checkbox.style.position = 'absolute';
                    checkbox.style.right = '4px';
                    checkbox.style.zIndex = '999';
                    // 添加值变化监听
                    checkbox.addEventListener('change', (event) => {
                        var _a;
                        const target = event.target;
                        const isChecked = target.hasAttribute('checked');
                        const treeNode = target.closest('.tree-node');
                        if (treeNode) {
                            // 更新节点的 is-active 属性
                            if (isChecked) {
                                treeNode.setAttribute('is-active', 'true');
                            }
                            else {
                                treeNode.setAttribute('is-active', 'false');
                            }
                            // 更新数据层
                            this.dataManager.refreshNodes();
                            console.log('Checkbox changed:', {
                                nodeName: (_a = treeNode.querySelector('.name .label')) === null || _a === void 0 ? void 0 : _a.textContent,
                                isChecked: isChecked
                            });
                        }
                    });
                    node.appendChild(checkbox);
                }
                // 根据 is-active 设置状态
                if (node.getAttribute('is-active') === 'true') {
                    checkbox.setAttribute('checked', '');
                }
                else {
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
            createVueApp(panel) {
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
                        handleSceneReady(uuid) {
                            console.log('场景已准备:', uuid);
                            self.dataManager.refreshNodes();
                            self.updateAllNodesUI();
                        },
                        handleReferenceImageShow(uuid) {
                            console.log('参考图显示:', uuid);
                            self.dataManager.refreshNodes();
                            self.updateAllNodesUI();
                        },
                        handleSceneChangeNode(uuid) {
                            console.log('节点变化:', uuid);
                            self.dataManager.refreshNodes();
                            self.updateAllNodesUI();
                        },
                        destroy() {
                            self.removeAllUI();
                            this.$destroy();
                        }
                    },
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
        function createHierarchyApp(panel) {
            var _a;
            const contentElement = (_a = panel.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('div > section.content');
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
        }
        else {
            console.error('未找到 hierarchy panel');
        }
    }
    catch (error) {
        console.error('操作失败:', error);
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9oYWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw0QkFBNEI7QUFDNUIsQ0FBQyxHQUFHLEVBQUU7SUFDRixJQUFJO1FBQ0EsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFM0IsdUJBQXVCO1FBQ3ZCLFNBQVMsaUJBQWlCO1lBQ3RCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDWixPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUMzQixPQUFPLElBQUksQ0FBQzthQUNmO1lBRUQsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQztZQUN4QyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDaEMsT0FBTyxJQUFJLENBQUM7YUFDZjtZQUVELE9BQU8sVUFBVSxDQUFDO1FBQ3RCLENBQUM7UUFFRCxTQUFTO1FBQ1QsU0FBUyxpQkFBaUI7WUFDdEIsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsVUFBVTtnQkFBRSxPQUFPLElBQUksQ0FBQztZQUU3QixNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDLGtGQUFrRixDQUFDLENBQUM7WUFDM0gsSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDUixPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ3JDLE9BQU8sSUFBSSxDQUFDO2FBQ2Y7WUFFRCxPQUFPLEtBQUssQ0FBQztRQUNqQixDQUFDO1FBRUQsTUFBTTtRQUNOLE1BQU0sWUFBWTtZQU9kLFlBQVksT0FBZ0I7Z0JBQ3hCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFnQixDQUFDO2dCQUNwRSxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUN4RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUU3RSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUEsU0FBUyxhQUFULFNBQVMsdUJBQVQsU0FBUyxDQUFFLFdBQVcsS0FBSSxFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO2dCQUN2QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1lBQ25DLENBQUM7WUFFRCxJQUFJLFFBQVE7Z0JBQ1IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxNQUFNLENBQUM7WUFDN0QsQ0FBQztZQUVELElBQUksVUFBVTtnQkFDVixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxLQUFLLE1BQU0sQ0FBQztZQUMvRCxDQUFDO1lBRUQsSUFBSSxRQUFRO2dCQUNSLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEtBQUssTUFBTSxDQUFDO1lBQzdELENBQUM7WUFFRCxJQUFJLFlBQVk7Z0JBQ1osT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsQ0FBQztZQUMvRCxDQUFDO1lBRUQsSUFBSSxPQUFPO2dCQUNQLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssTUFBTSxDQUFDO1lBQzVELENBQUM7WUFFRCxJQUFJLEtBQUs7Z0JBQ0wsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDN0MsQ0FBQztZQUVELElBQUksUUFBUTtnQkFDUixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxLQUFLLE1BQU0sQ0FBQztZQUM3RCxDQUFDO1lBRUQsT0FBTztZQUNQLE1BQU07Z0JBQ0YsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtvQkFDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ25ELElBQUksS0FBSyxFQUFFO3dCQUNOLEtBQXFCLENBQUMsS0FBSyxFQUFFLENBQUM7cUJBQ2xDO2lCQUNKO1lBQ0wsQ0FBQztZQUVELE9BQU87WUFDUCxRQUFRO2dCQUNKLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO29CQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDbkQsSUFBSSxLQUFLLEVBQUU7d0JBQ04sS0FBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztxQkFDbEM7aUJBQ0o7WUFDTCxDQUFDO1lBRUQsaUJBQWlCO1lBQ2pCLGNBQWM7Z0JBQ1YsSUFBSSxNQUFNLEdBQW1CLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ25CLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRCxDQUFDLENBQUMsQ0FBQztnQkFDSCxPQUFPLE1BQU0sQ0FBQztZQUNsQixDQUFDO1lBRUQsaUJBQWlCO1lBQ2pCLGFBQWE7Z0JBQ1QsTUFBTSxNQUFNLEdBQW1CLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztnQkFDMUIsT0FBTyxPQUFPLEVBQUU7b0JBQ1osTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDckIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7aUJBQzVCO2dCQUNELE9BQU8sTUFBTSxDQUFDO1lBQ2xCLENBQUM7WUFFRCxrQkFBa0I7WUFDbEIsb0JBQW9CO2dCQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDaEUsQ0FBQztZQUVELGtCQUFrQjtZQUNsQixpQkFBaUI7Z0JBQ2IsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQy9ELENBQUM7WUFFRCxrQkFBa0I7WUFDbEIsWUFBWTtnQkFDUixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDNUQsQ0FBQztZQUVELDBCQUEwQjtZQUMxQixPQUFPO2dCQUNILE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkYsT0FBTyxJQUFJLENBQUM7WUFDaEIsQ0FBQztZQUVELGVBQWU7WUFDZixhQUFhLENBQUMsWUFBb0IsR0FBRztnQkFDakMsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzFDLENBQUM7U0FDSjtRQUVELFdBQVc7UUFDWCxNQUFNLG9CQUFvQjtZQUt0QixZQUFZLGNBQXVCO2dCQUozQixVQUFLLEdBQW1CLEVBQUUsQ0FBQztnQkFLL0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxJQUFJLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCxTQUFTO1lBQ1QsWUFBWTtnQkFDUixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUM5RCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3hFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxDQUFDO1lBRUQsWUFBWTtZQUNKLGNBQWMsQ0FBQyxLQUFxQjtnQkFDeEMsTUFBTSxTQUFTLEdBQW1CLEVBQUUsQ0FBQztnQkFFckMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDMUIsWUFBWTtvQkFDWixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7b0JBRW5CLE9BQU8sU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7d0JBQzVGLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztxQkFDbkI7b0JBRUQsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTt3QkFDdEIsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQy9DLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO3dCQUNyQixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDOUI7b0JBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO3dCQUNmLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ3hCO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUVILE9BQU8sS0FBSyxDQUFDO1lBQ2pCLENBQUM7WUFFRCxXQUFXO1lBQ1gsUUFBUTtnQkFDSixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDdEIsQ0FBQztZQUVELFNBQVM7WUFDVCxpQkFBaUI7Z0JBQ2IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3hCLENBQUM7U0FDSjtRQUVELFlBQVk7UUFDWixNQUFNLGtCQUFrQjtZQUdwQixZQUFZLFdBQWlDO2dCQUN6QyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztZQUNuQyxDQUFDO1lBRUQsY0FBYztZQUNkLGtCQUFrQixDQUFDLElBQWE7Z0JBQzVCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLFFBQVEsRUFBRTtvQkFDWCxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztvQkFDakQsUUFBUSxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQztvQkFDMUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBRXZDLFVBQVU7b0JBQ1QsUUFBd0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztvQkFDckQsUUFBd0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztvQkFDN0MsUUFBd0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztvQkFFL0MsVUFBVTtvQkFDVixRQUFRLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBWSxFQUFFLEVBQUU7O3dCQUNqRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBMEIsQ0FBQzt3QkFDaEQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDakQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQzt3QkFFOUMsSUFBSSxRQUFRLEVBQUU7NEJBQ1YscUJBQXFCOzRCQUNyQixJQUFJLFNBQVMsRUFBRTtnQ0FDWCxRQUFRLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQzs2QkFDOUM7aUNBQU07Z0NBQ0gsUUFBUSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7NkJBQy9DOzRCQUVELFFBQVE7NEJBQ1IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQzs0QkFFaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRTtnQ0FDN0IsUUFBUSxFQUFFLE1BQUEsUUFBUSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsMENBQUUsV0FBVztnQ0FDN0QsU0FBUyxFQUFFLFNBQVM7NkJBQ3ZCLENBQUMsQ0FBQzt5QkFDTjtvQkFDTCxDQUFDLENBQUMsQ0FBQztvQkFFSCxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUM5QjtnQkFFRCxvQkFBb0I7Z0JBQ3BCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxNQUFNLEVBQUU7b0JBQzNDLFFBQVEsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUN4QztxQkFBTTtvQkFDSCxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2lCQUN2QztZQUNMLENBQUM7WUFFRCxhQUFhO1lBQ2IsZ0JBQWdCO2dCQUNaLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDakUsQ0FBQztZQUVELGFBQWE7WUFDYixXQUFXO2dCQUNQLFVBQVU7Z0JBQ1YsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDMUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQztvQkFDbkUsSUFBSSxRQUFRLEVBQUU7d0JBQ1YsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO3FCQUNyQjtnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFFRCxZQUFZO1lBQ1osWUFBWSxDQUFDLEtBQWM7Z0JBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztnQkFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUM7b0JBQ2hCLElBQUk7d0JBQ0EsT0FBTzs0QkFDSCxRQUFRLEVBQUU7Z0NBQ04sS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFOzZCQUNyQzt5QkFDSixDQUFDO29CQUNOLENBQUM7b0JBQ0QsT0FBTyxFQUFFO3dCQUNMLGdCQUFnQixDQUFDLElBQVk7NEJBQ3pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDOzRCQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDOzRCQUNoQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDNUIsQ0FBQzt3QkFDRCx3QkFBd0IsQ0FBQyxJQUFZOzRCQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQzs0QkFDNUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQzs0QkFDaEMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQzVCLENBQUM7d0JBRUQscUJBQXFCLENBQUMsSUFBWTs0QkFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7NEJBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7NEJBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUM1QixDQUFDO3dCQUNELE9BQU87NEJBQ0gsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDOzRCQUNuQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQ3BCLENBQUM7cUJBQ0c7b0JBQ1IsT0FBTzt3QkFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO3dCQUMxQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDeEIsTUFBTSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7b0JBQy9CLENBQUM7aUJBQ0osQ0FBQyxDQUFDO2dCQUVILEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVztnQkFDdEQsT0FBTyxHQUFHLENBQUM7WUFDZixDQUFDO1NBQ0o7UUFFRCxpQkFBaUI7UUFDakIsU0FBUyxrQkFBa0IsQ0FBQyxLQUFjOztZQUN0QyxNQUFNLGNBQWMsR0FBRyxNQUFBLEtBQUssQ0FBQyxVQUFVLDBDQUFFLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ2hGLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDaEMsT0FBTzthQUNWO1lBRUQsa0JBQWtCO1lBQ2xCLE1BQU0sV0FBVyxHQUFHLElBQUksb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDN0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUV0RCxTQUFTO1lBQ1QsU0FBUyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFFN0IsZUFBZTtZQUNmLE9BQU8sU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQsTUFBTTtRQUNOLE1BQU0sY0FBYyxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDM0MsSUFBSSxjQUFjLEVBQUU7WUFDaEIsZUFBZTtZQUNmLE1BQU0sR0FBRyxHQUFHLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQy9DLFVBQVU7WUFDVixNQUFNLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQztZQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUUvQixrQkFBa0I7WUFDbEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztTQUVyRTthQUFNO1lBQ0gsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1NBQ3hDO0tBRUo7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ2pDO0FBRUwsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIOivpeiEmuacrOWPquiDveS9v+eUqHJlcXVpcmXvvIzkuI3lj6/ku6VpbXBvb3J0XHJcbigoKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG4gICAgICAgIGNvbnN0IFZ1ZSA9IHJlcXVpcmUoJ3Z1ZScpO1xyXG5cclxuICAgICAgICAvLyDojrflj5YgZG9jayDnmoQgc2hhZG93Um9vdFxyXG4gICAgICAgIGZ1bmN0aW9uIGdldERvY2tTaGFkb3dSb290KCkge1xyXG4gICAgICAgICAgICBjb25zdCBkb2NrRnJhbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZG9jaycpO1xyXG4gICAgICAgICAgICBpZiAoIWRvY2tGcmFtZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5pyq5om+5YiwICNkb2NrJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgc2hhZG93Um9vdCA9IGRvY2tGcmFtZS5zaGFkb3dSb290O1xyXG4gICAgICAgICAgICBpZiAoIXNoYWRvd1Jvb3QpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+acquaJvuWIsCBzaGFkb3dSb290Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHNoYWRvd1Jvb3Q7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyDojrflj5blsYLnuqfpnaLmnb9cclxuICAgICAgICBmdW5jdGlvbiBnZXRIaWVyYXJjaHlQYW5lbCgpIHtcclxuICAgICAgICAgICAgY29uc3Qgc2hhZG93Um9vdCA9IGdldERvY2tTaGFkb3dSb290KCk7XHJcbiAgICAgICAgICAgIGlmICghc2hhZG93Um9vdCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBwYW5lbCA9IHNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcignZG9jay1sYXlvdXQgPiBkb2NrLWxheW91dDpudGgtY2hpbGQoNSkgPiBkb2NrLWdyb3VwcyA+IGRvY2stcGFuZWxzID4gcGFuZWwtZnJhbWUnKTtcclxuICAgICAgICAgICAgaWYgKCFwYW5lbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5pyq5om+5YiwIGhpZXJhcmNoeSBwYW5lbCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBwYW5lbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIOiKgueCueexu1xyXG4gICAgICAgIGNsYXNzIFRyZWVOb2RlSW5mbyB7XHJcbiAgICAgICAgICAgIG5hbWU6IHN0cmluZztcclxuICAgICAgICAgICAgZWxlbWVudDogRWxlbWVudDtcclxuICAgICAgICAgICAgcGFyZW50OiBUcmVlTm9kZUluZm8gfCBudWxsO1xyXG4gICAgICAgICAgICBjaGlsZHJlbjogVHJlZU5vZGVJbmZvW107XHJcbiAgICAgICAgICAgIHBhZGRpbmdMZWZ0OiBudW1iZXI7XHJcblxyXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcihlbGVtZW50OiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkcmFnSXRlbSA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLmRyYWctaXRlbScpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZUxhYmVsID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcubmFtZSAubGFiZWwnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhZGRpbmdMZWZ0ID0gZHJhZ0l0ZW0gPyBwYXJzZUludChkcmFnSXRlbS5zdHlsZS5wYWRkaW5nTGVmdCkgfHwgMCA6IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5uYW1lID0gbmFtZUxhYmVsPy50ZXh0Q29udGVudCB8fCAnJztcclxuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmVudCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkcmVuID0gW107XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhZGRpbmdMZWZ0ID0gcGFkZGluZ0xlZnQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGdldCBpc0V4cGFuZCgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdpcy1leHBhbmQnKSA9PT0gJ3RydWUnO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBnZXQgaXNTZWxlY3RlZCgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdpcy1zZWxlY3RlZCcpID09PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGdldCBpc1BhcmVudCgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdpcy1wYXJlbnQnKSA9PT0gJ3RydWUnO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBnZXQgaXNQcmVmYWJOb2RlKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2lzLXByZWZhYi1ub2RlJykgPT09ICcxJztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZ2V0IGlzU2NlbmUoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgnaXMtc2NlbmUnKSA9PT0gJ3RydWUnO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBnZXQgbGV2ZWwoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKHRoaXMucGFkZGluZ0xlZnQgLyAxNik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGdldCBpc0FjdGl2ZSgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdpcy1hY3RpdmUnKSA9PT0gJ3RydWUnO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDlsZXlvIDoioLngrlcclxuICAgICAgICAgICAgZXhwYW5kKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNQYXJlbnQgJiYgIXRoaXMuaXNFeHBhbmQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcnJvdyA9IHRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3cnKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJyb3cpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGFycm93IGFzIEhUTUxFbGVtZW50KS5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8g5oqY5Y+g6IqC54K5XHJcbiAgICAgICAgICAgIGNvbGxhcHNlKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNQYXJlbnQgJiYgdGhpcy5pc0V4cGFuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFycm93ID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcnJvdykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoYXJyb3cgYXMgSFRNTEVsZW1lbnQpLmNsaWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDojrflj5bmiYDmnInlrZDoioLngrnvvIjljIXmi6zlrZnoioLngrnvvIlcclxuICAgICAgICAgICAgZ2V0QWxsQ2hpbGRyZW4oKTogVHJlZU5vZGVJbmZvW10ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdDogVHJlZU5vZGVJbmZvW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChjaGlsZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goY2hpbGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoY2hpbGQuZ2V0QWxsQ2hpbGRyZW4oKSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIOiOt+WPluaJgOacieeItuiKgueCue+8iOebtOWIsOagueiKgueCue+8iVxyXG4gICAgICAgICAgICBnZXRBbGxQYXJlbnRzKCk6IFRyZWVOb2RlSW5mb1tdIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogVHJlZU5vZGVJbmZvW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGxldCBjdXJyZW50ID0gdGhpcy5wYXJlbnQ7XHJcbiAgICAgICAgICAgICAgICB3aGlsZSAoY3VycmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGN1cnJlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50LnBhcmVudDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuaJgOacieWtkOiKgueCuemDveaYr+a/gOa0u+eKtuaAgVxyXG4gICAgICAgICAgICBhcmVBbGxDaGlsZHJlbkFjdGl2ZSgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEFsbENoaWxkcmVuKCkuZXZlcnkoY2hpbGQgPT4gY2hpbGQuaXNBY3RpdmUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbmnInku7vkvZXlrZDoioLngrnmmK/mv4DmtLvnirbmgIFcclxuICAgICAgICAgICAgaGFzQW55Q2hpbGRBY3RpdmUoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBbGxDaGlsZHJlbigpLnNvbWUoY2hpbGQgPT4gY2hpbGQuaXNBY3RpdmUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDlsZXlvIDliLDmraToioLngrnvvIjlsZXlvIDmiYDmnInniLboioLngrnvvIlcclxuICAgICAgICAgICAgZXhwYW5kVG9UaGlzKCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRBbGxQYXJlbnRzKCkuZm9yRWFjaChwYXJlbnQgPT4gcGFyZW50LmV4cGFuZCgpKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8g6I635Y+W6IqC54K555qE6Lev5b6E77yI5LuO5qC56IqC54K55Yiw5b2T5YmN6IqC54K555qE5ZCN56ew5pWw57uE77yJXHJcbiAgICAgICAgICAgIGdldFBhdGgoKTogc3RyaW5nW10ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IFsuLi50aGlzLmdldEFsbFBhcmVudHMoKS5yZXZlcnNlKCkubWFwKG5vZGUgPT4gbm9kZS5uYW1lKSwgdGhpcy5uYW1lXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDojrflj5boioLngrnnmoTlrozmlbTot6/lvoTlrZfnrKbkuLJcclxuICAgICAgICAgICAgZ2V0UGF0aFN0cmluZyhzZXBhcmF0b3I6IHN0cmluZyA9ICcvJyk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQYXRoKCkuam9pbihzZXBhcmF0b3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyDmlbDmja7lsYLvvJroioLngrnnrqHnkIZcclxuICAgICAgICBjbGFzcyBIaWVyYXJjaHlEYXRhTWFuYWdlciB7XHJcbiAgICAgICAgICAgIHByaXZhdGUgbm9kZXM6IFRyZWVOb2RlSW5mb1tdID0gW107XHJcbiAgICAgICAgICAgIHByaXZhdGUgY29udGVudDogRWxlbWVudDtcclxuICAgICAgICAgICAgcHJpdmF0ZSB0cmVlOiBFbGVtZW50IHwgbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yKGNvbnRlbnRFbGVtZW50OiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnQgPSBjb250ZW50RWxlbWVudDtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJlZSA9IGNvbnRlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy50cmVlJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2hOb2RlcygpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDliLfmlrDoioLngrnmlbDmja5cclxuICAgICAgICAgICAgcmVmcmVzaE5vZGVzKCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdHJlZU5vZGVzID0gdGhpcy5jb250ZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy50cmVlLW5vZGUnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gQXJyYXkuZnJvbSh0cmVlTm9kZXMpLm1hcChub2RlID0+IG5ldyBUcmVlTm9kZUluZm8obm9kZSkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub2RlcyA9IHRoaXMuYnVpbGRIaWVyYXJjaHkobm9kZXMpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDmnoTlu7roioLngrnnmoTniLblrZDlhbPns7tcclxuICAgICAgICAgICAgcHJpdmF0ZSBidWlsZEhpZXJhcmNoeShub2RlczogVHJlZU5vZGVJbmZvW10pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVTdGFjazogVHJlZU5vZGVJbmZvW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICBub2Rlcy5mb3JFYWNoKChub2RlLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOa4heepuuS5i+WJjeeahOeItuWtkOWFs+ezu1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUucGFyZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBub2RlLmNoaWxkcmVuID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChub2RlU3RhY2subGVuZ3RoID4gMCAmJiBub2RlU3RhY2tbbm9kZVN0YWNrLmxlbmd0aCAtIDFdLnBhZGRpbmdMZWZ0ID49IG5vZGUucGFkZGluZ0xlZnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGVTdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IG5vZGVTdGFja1tub2RlU3RhY2subGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucGFyZW50ID0gcGFyZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmlzUGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVTdGFjay5wdXNoKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlcztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8g6I635Y+W5omA5pyJ6IqC54K55L+h5oGvXHJcbiAgICAgICAgICAgIGdldE5vZGVzKCk6IFRyZWVOb2RlSW5mb1tdIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGVzO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDojrflj5blhoXlrrnlhYPntKBcclxuICAgICAgICAgICAgZ2V0Q29udGVudEVsZW1lbnQoKTogRWxlbWVudCB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyDnu5jliLblsYLvvJpVSSDnrqHnkIZcclxuICAgICAgICBjbGFzcyBIaWVyYXJjaHlVSU1hbmFnZXIge1xyXG4gICAgICAgICAgICBwcml2YXRlIGRhdGFNYW5hZ2VyOiBIaWVyYXJjaHlEYXRhTWFuYWdlcjtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yKGRhdGFNYW5hZ2VyOiBIaWVyYXJjaHlEYXRhTWFuYWdlcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhTWFuYWdlciA9IGRhdGFNYW5hZ2VyO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDliJvlu7rmiJbmm7TmlrDoioLngrnnmoTlpI3pgInmoYZcclxuICAgICAgICAgICAgdXBkYXRlTm9kZUNoZWNrYm94KG5vZGU6IEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBjaGVja2JveCA9IG5vZGUucXVlcnlTZWxlY3RvcignLmhpZXJhcmNoeS1jaGVja2JveCcpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFjaGVja2JveCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktY2hlY2tib3gnKTtcclxuICAgICAgICAgICAgICAgICAgICBjaGVja2JveC5jbGFzc05hbWUgPSAnaGllcmFyY2h5LWNoZWNrYm94JztcclxuICAgICAgICAgICAgICAgICAgICBjaGVja2JveC5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgJzAnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g6K6+572u5aSN6YCJ5qGG5L2N572uXHJcbiAgICAgICAgICAgICAgICAgICAgKGNoZWNrYm94IGFzIEhUTUxFbGVtZW50KS5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgKGNoZWNrYm94IGFzIEhUTUxFbGVtZW50KS5zdHlsZS5yaWdodCA9ICc0cHgnO1xyXG4gICAgICAgICAgICAgICAgICAgIChjaGVja2JveCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuekluZGV4ID0gJzk5OSc7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOa3u+WKoOWAvOWPmOWMluebkeWQrFxyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChldmVudDogRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IHRhcmdldC5oYXNBdHRyaWJ1dGUoJ2NoZWNrZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJlZU5vZGUgPSB0YXJnZXQuY2xvc2VzdCgnLnRyZWUtbm9kZScpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyZWVOb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDoioLngrnnmoQgaXMtYWN0aXZlIOWxnuaAp1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyZWVOb2RlLnNldEF0dHJpYnV0ZSgnaXMtYWN0aXZlJywgJ3RydWUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJlZU5vZGUuc2V0QXR0cmlidXRlKCdpcy1hY3RpdmUnLCAnZmFsc2UnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDmlbDmja7lsYJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YU1hbmFnZXIucmVmcmVzaE5vZGVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NoZWNrYm94IGNoYW5nZWQ6Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiB0cmVlTm9kZS5xdWVyeVNlbGVjdG9yKCcubmFtZSAubGFiZWwnKT8udGV4dENvbnRlbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDaGVja2VkOiBpc0NoZWNrZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hlY2tib3gpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIOagueaNriBpcy1hY3RpdmUg6K6+572u54q25oCBXHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5nZXRBdHRyaWJ1dGUoJ2lzLWFjdGl2ZScpID09PSAndHJ1ZScpIHtcclxuICAgICAgICAgICAgICAgICAgICBjaGVja2JveC5zZXRBdHRyaWJ1dGUoJ2NoZWNrZWQnLCAnJyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrYm94LnJlbW92ZUF0dHJpYnV0ZSgnY2hlY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDmm7TmlrDmiYDmnInoioLngrnnmoQgVUlcclxuICAgICAgICAgICAgdXBkYXRlQWxsTm9kZXNVSSgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gdGhpcy5kYXRhTWFuYWdlci5nZXROb2RlcygpO1xyXG4gICAgICAgICAgICAgICAgbm9kZXMuZm9yRWFjaChub2RlID0+IHRoaXMudXBkYXRlTm9kZUNoZWNrYm94KG5vZGUuZWxlbWVudCkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDnp7vpmaTmiYDmnIkgVUkg5YWD57SgXHJcbiAgICAgICAgICAgIHJlbW92ZUFsbFVJKCkge1xyXG4gICAgICAgICAgICAgICAgLy8g56e76Zmk5omA5pyJ5aSN6YCJ5qGGXHJcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlcyA9IHRoaXMuZGF0YU1hbmFnZXIuZ2V0Tm9kZXMoKTtcclxuICAgICAgICAgICAgICAgIG5vZGVzLmZvckVhY2gobm9kZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tib3ggPSBub2RlLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmhpZXJhcmNoeS1jaGVja2JveCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGVja2JveCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2JveC5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8g5Yib5bu6IFZ1ZSDlupTnlKhcclxuICAgICAgICAgICAgY3JlYXRlVnVlQXBwKHBhbmVsOiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFwcCA9IG5ldyBWdWUoe1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmVlRGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzOiBzZWxmLmRhdGFNYW5hZ2VyLmdldE5vZGVzKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2NlbmVSZWFkeSh1dWlkOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCflnLrmma/lt7Llh4blpIc6JywgdXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmRhdGFNYW5hZ2VyLnJlZnJlc2hOb2RlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi51cGRhdGVBbGxOb2Rlc1VJKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZVJlZmVyZW5jZUltYWdlU2hvdyh1dWlkOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCflj4LogIPlm77mmL7npLo6JywgdXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmRhdGFNYW5hZ2VyLnJlZnJlc2hOb2RlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi51cGRhdGVBbGxOb2Rlc1VJKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY2VuZUNoYW5nZU5vZGUodXVpZDogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn6IqC54K55Y+Y5YyWOicsIHV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5kYXRhTWFuYWdlci5yZWZyZXNoTm9kZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYudXBkYXRlQWxsTm9kZXNVSSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXN0cm95KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZW1vdmVBbGxVSSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kZGVzdHJveSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBhcyBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgbW91bnRlZCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1Z1ZSDlupTnlKjmjILovb3miJDlip8nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi51cGRhdGVBbGxOb2Rlc1VJKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5oaWVyYXJjaHlBcHAgPSB0aGlzO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGFwcC4kbW91bnQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpOyAvLyDliJvlu7rkuIDkuKrkuLTml7blrrnlmahcclxuICAgICAgICAgICAgICAgIHJldHVybiBhcHA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIOWIm+W7uiBWdWUg5bqU55So55qE5YWl5Y+j5Ye95pWwXHJcbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlSGllcmFyY2h5QXBwKHBhbmVsOiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRFbGVtZW50ID0gcGFuZWwuc2hhZG93Um9vdD8ucXVlcnlTZWxlY3RvcignZGl2ID4gc2VjdGlvbi5jb250ZW50Jyk7XHJcbiAgICAgICAgICAgIGlmICghY29udGVudEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+acquaJvuWIsCBjb250ZW50IOWFg+e0oCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDliJvlu7rmlbDmja7nrqHnkIblmajlkowgVUkg566h55CG5ZmoXHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGFNYW5hZ2VyID0gbmV3IEhpZXJhcmNoeURhdGFNYW5hZ2VyKGNvbnRlbnRFbGVtZW50KTtcclxuICAgICAgICAgICAgY29uc3QgdWlNYW5hZ2VyID0gbmV3IEhpZXJhcmNoeVVJTWFuYWdlcihkYXRhTWFuYWdlcik7XHJcblxyXG4gICAgICAgICAgICAvLyDliJ3lp4vljJYgVUlcclxuICAgICAgICAgICAgdWlNYW5hZ2VyLnVwZGF0ZUFsbE5vZGVzVUkoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIOWIm+W7uuW5tui/lOWbniBWdWUg5bqU55SoXHJcbiAgICAgICAgICAgIHJldHVybiB1aU1hbmFnZXIuY3JlYXRlVnVlQXBwKHBhbmVsKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIOS4u+mAu+i+kVxyXG4gICAgICAgIGNvbnN0IGhpZXJhcmNoeVBhbmVsID0gZ2V0SGllcmFyY2h5UGFuZWwoKTtcclxuICAgICAgICBpZiAoaGllcmFyY2h5UGFuZWwpIHtcclxuICAgICAgICAgICAgLy8g5Yib5bu65bm25oyC6L29IFZ1ZSDlupTnlKhcclxuICAgICAgICAgICAgY29uc3QgYXBwID0gY3JlYXRlSGllcmFyY2h5QXBwKGhpZXJhcmNoeVBhbmVsKTtcclxuICAgICAgICAgICAgLy8g5L+d5a2Y5Yiw5YWo5bGA5Y+Y6YePXHJcbiAgICAgICAgICAgIHdpbmRvdy5oaWVyYXJjaHlBcHAgPSBhcHA7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdWdWUg5bqU55So5Yib5bu65oiQ5YqfJywgYXBwKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOmAmuefpeS4u+i/m+eoi1Z1ZeW6lOeUqOW3suWHhuWkh+Wwsee7qlxyXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5zZW5kKCdoaWVyYXJjaHktZXh0ZW5zaW9uJywgJ2hpZXJhcmNoeS1hcHAtcmVhZHknKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign5pyq5om+5YiwIGhpZXJhcmNoeSBwYW5lbCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ+aTjeS9nOWksei0pTonLCBlcnJvcik7XHJcbiAgICB9XHJcblxyXG59KSgpO1xyXG5cclxuIl19