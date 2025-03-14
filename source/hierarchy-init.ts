import { HierarchyEvents, HierarchyEventMap, TreeNode, ExtensionOptions, ExtensionInstance, HierarchyManager, HierarchyTree, TreeNodeVueComponent, HierarchyEventOptions } from './types';

(async function () {
    // 创建一个Promise，用于通知其他模块层级管理器已就绪
    let resolveHierarchyReady: (value: boolean) => void;
    window.hierarchyReady = new Promise<boolean>((resolve) => {
        resolveHierarchyReady = resolve;
    });

    /** 获取层级面板的Vue实例 */
    function getHierarchyVue() {
        // 1. 获取 dock-frame
        const dockFrame = document.getElementsByTagName("dock-frame")[0];
        if (!dockFrame?.shadowRoot) {
            console.warn(`[hierarchy]`, '未找到dock-frame');
            return null;
        }

        // 2. 获取 hierarchy 面板
        const panelFrames = dockFrame.shadowRoot.querySelectorAll("panel-frame");
        const hierarchyPanel = Array.from(panelFrames).find(panel =>
            panel.getAttribute("name") === "hierarchy"
        );

        if (!hierarchyPanel?.shadowRoot) {
            console.warn(`[hierarchy]`, '未找到hierarchy面板');
            return null;
        }

        // 3. 获取drag-area
        const dragArea = hierarchyPanel.shadowRoot.querySelector("ui-drag-area");
        if (!dragArea) {
            console.warn(`[hierarchy]`, '未找到drag-area');
            return null;
        }

        // 4. 获取Vue实例
        const vue = (dragArea as any).__vue__;
        if (!vue) {
            console.warn(`[hierarchy]`, '未找到Vue实例');
            return null;
        }

        // 5. 等待节点数据加载
        if (!vue.nodes?.length) {
            // console.warn(`[hierarchy]`, '节点数据未加载');
            return null;
        }

        return vue;
    };

    /** 创建事件系统 */
    function createEvents(): HierarchyEvents {
        // 使用Map存储事件监听器，键为事件名，值为包含回调和选项的对象数组
        const listeners = new Map<keyof HierarchyEventMap, Array<{
            callback: Function,
            options?: HierarchyEventOptions;
        }>>();

        return {
            listeners: new Map<keyof HierarchyEventMap, Function[]>(),

            emit<K extends keyof HierarchyEventMap>(event: K, ...args: Parameters<HierarchyEventMap[K]>) {
                const eventListeners = listeners.get(event) || [];

                // 按优先级排序
                const sortedListeners = [...eventListeners].sort((a, b) =>
                    (b.options?.priority || 0) - (a.options?.priority || 0)
                );

                // 执行回调
                sortedListeners.forEach(({ callback, options }) => {
                    try {
                        callback(...args);
                    } catch (error) {
                        console.error(`[hierarchy-events]`, '事件处理错误:', String(event), error);
                    }

                    // 如果是一次性事件，执行后移除
                    if (options?.once) {
                        this.off(event, callback as any);
                    }
                });
            },

            on<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K], options?: HierarchyEventOptions) {
                if (!listeners.has(event)) {
                    listeners.set(event, []);
                }

                listeners.get(event)!.push({
                    callback: callback as Function,
                    options
                });

                // 为了兼容旧的接口，同时更新listeners Map
                if (!this.listeners.has(event)) {
                    this.listeners.set(event, []);
                }
                this.listeners.get(event)!.push(callback as Function);
            },

            off<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K]) {
                const eventListeners = listeners.get(event);
                if (eventListeners) {
                    const index = eventListeners.findIndex(item => item.callback === callback);
                    if (index > -1) {
                        eventListeners.splice(index, 1);
                    }
                }

                // 同时更新旧的listeners Map
                const oldListeners = this.listeners.get(event);
                if (oldListeners) {
                    const index = oldListeners.indexOf(callback as Function);
                    if (index > -1) {
                        oldListeners.splice(index, 1);
                    }
                }
            },

            clear() {
                listeners.clear();
                this.listeners.clear();
            }
        };
    }

    /** 创建节点树系统 */
    function createTree(): HierarchyTree {
        const nodeMap = new Map<string, TreeNode>();

        return {
            nodeMap,

            clear() {
                nodeMap.clear();
            },

            getNode(uuid: string) {
                return nodeMap.get(uuid);
            },

            addNode(node: TreeNode) {
                // 确保node有children数组
                if (!node.children) {
                    node.children = [];
                }

                nodeMap.set(node.uuid, node);

                // 处理父子关系
                if (node.parent) {
                    const parentNode = nodeMap.get(node.parent);
                    if (parentNode) {
                        parentNode.children.push(node);
                    }
                }
            },

            removeNode(uuid: string) {
                const node = nodeMap.get(uuid);
                if (!node) return;

                // 从父节点中移除
                if (node.parent) {
                    const parentNode = nodeMap.get(node.parent);
                    if (parentNode) {
                        parentNode.children = parentNode.children.filter(
                            child => child.uuid !== uuid
                        );
                    }
                }

                // 递归移除所有子节点
                node.children.forEach(child => this.removeNode(child.uuid));
                nodeMap.delete(uuid);
            },

            getNodeCount() {
                return nodeMap.size;
            }
        };
    }

    /** 创建扩展系统 */
    function createExtension(manager: HierarchyManager) {
        const extensions = new Map<string, ExtensionInstance>();
        let currentAssetId = '';
        let currentAssetType: 'scene' | 'prefab' = 'scene';

        /** 检查资源是否变化 */
        function checkAssetChange(vue: any) {
            if (!manager.vue?.nodes?.length) {
                if (currentAssetId) {
                    currentAssetId = '';
                    currentAssetType = 'scene';
                    return true;
                }
                return false;
            }

            const firstNode = manager.vue.nodes[0];
            const firstNodeData = manager.getNode(firstNode.uuid);
            if (!firstNodeData) return false;

            const newAssetId = firstNodeData.type === "cc.Scene"
                ? firstNodeData.uuid
                : firstNodeData.prefab?.assetUuid || "";
            const newAssetType = firstNodeData.type === "cc.Scene" ? 'scene' : 'prefab';

            if (newAssetId !== currentAssetId) {
                currentAssetId = newAssetId;
                currentAssetType = newAssetType;
                return true;
            }

            return false;
        }

        return {
            add(options: ExtensionOptions): void {
                if (extensions.has(options.id)) {
                    throw new Error(`Extension with id ${options.id} already exists`);
                }

                extensions.set(options.id, options);
                console.info(`[hierarchy-extension]`, '添加扩展:', options.id);
                manager.events?.emit('extensionAdded', options);
                this.updateAll();
            },

            get(id: string) {
                return extensions.get(id);
            },

            remove(id: string) {
                const extension = extensions.get(id);
                if (extension) {
                    extension.onDestroy?.();
                    extensions.delete(id);
                    console.info(`[hierarchy-extension]`, '移除扩展:', id);
                    manager.events?.emit('extensionRemoved', id);
                }
            },

            getAll() {
                return Array.from(extensions.values());
            },

            updateAll() {
                if (!manager.vue || !manager.tree) {
                    console.error(`[hierarchy-extension]`, '更新取消: manager未就绪');
                    return;
                }

                if (checkAssetChange(manager.vue)) {
                    manager.events?.emit('assetChange', currentAssetId, currentAssetType);
                }

                // 按优先级排序扩展
                const sortedExtensions = Array.from(extensions.values())
                    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

                for (const uuid of manager.tree.nodeMap.keys()) {
                    const node = manager.getNode(uuid);
                    const vueComponent = manager.getVueComponent(uuid);

                    if (!node || !vueComponent) continue;

                    const element = vueComponent.$el;
                    if (!element) continue;

                    // 创建或获取container
                    let container = element.querySelector('.hierarchy-extension-container') as HTMLElement;
                    if (!container) {
                        // 只在第一次设置position
                        element.style.position = 'relative';

                        container = document.createElement('div');
                        container.className = 'hierarchy-extension-container';
                        container.style.cssText = `
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            pointer-events: none;
                            z-index: 999;
                        `;
                        element.appendChild(container);
                    }

                    sortedExtensions.forEach(extension => {
                        const visible = extension.isVisible?.(node) ?? true;
                        if (!visible) {
                            extension.onDestroy?.(node);
                            return;
                        }

                        if (container) {
                            extension.onCreate?.(node, container);
                        }
                    });
                }
            },

            clear() {
                Array.from(extensions.keys()).forEach(id => this.remove(id));
            }
        };
    }

    /** 创建层级管理器 */
    function createHierarchyManager(): HierarchyManager {
        const manager: HierarchyManager = {
            vue: null,
            tree: null,
            events: null,
            extension: null,

            refresh: window.utils.debounce(function (this: HierarchyManager) {
                this._doRefresh();
            }, 50),

            _doRefresh() {
                if (!this.vue || !this.tree) return;

                this.tree.clear();

                // 批量处理节点
                const nodeBatch = [...this.vue.nodes];

                // 先建立树结构
                for (const node of nodeBatch) {
                    this.tree.addNode(node);
                }

                // 然后处理Vue组件
                for (const node of nodeBatch) {
                    // 获取对应的Vue组件实例
                    const treeNode = this.getVueComponent(node.uuid);

                    if (treeNode) {
                        // 设置组件引用
                        node.vueComponent = treeNode;
                    }
                }

                // 触发更新事件
                this.events?.emit('treeUpdate');

                // 更新所有扩展
                this.extension?.updateAll();
            },

            getNodeHierarchyInfo(node: TreeNode): any {
                return {
                    name: node.name,
                    type: node.type,
                    children: node.children.map(child => this.getNodeHierarchyInfo(child))
                };
            },

            getElement(uuid: string): HTMLElement | undefined {
                return this.getVueComponent(uuid)?.$el;
            },

            getVueComponent(uuid: string): TreeNodeVueComponent | undefined {
                if (!this.vue?.$children) return undefined;
                return this.vue.$children.find(child => child.$props.node.uuid === uuid);
            },

            getNode(uuid: string): TreeNode | undefined {
                return this.tree?.getNode(uuid);
            },

            init() {
                const vue = getHierarchyVue();
                if (!vue) return false;

                this.vue = vue;
                this.tree = createTree();
                this.events = createEvents();
                this.extension = createExtension(this);

                // 修改watch回调，避免重复触发更新事件
                this.vue!.$watch('nodes', () => {
                    this.refresh();  // refresh内部会触发treeUpdate和updateAll
                });

                this.refresh();  // 初始化时调用一次refresh，它会同时处理树更新和扩展更新
                this.events?.emit('initialized');
                return true;
            },

            destroy() {
                this.extension?.clear();
                this.events?.emit('destroy');
                this.events?.clear();
                this.tree?.clear();
                this.vue = null;
                this.tree = null;
                this.events = null;
                this.extension = null;
            },

            cleanup() {
                // 清理扩展系统
                this.extension?.clear();

                // 移除所有事件监听
                this.events?.emit('destroy');
                this.events?.clear();

                // 清理树结构
                this.tree?.clear();

                // 清理DOM中的扩展元素
                if (this.vue?.$el) {
                    const extensions = this.vue.$el.querySelectorAll('[class*="hierarchy-"]');
                    extensions.forEach(el => el.remove());
                }

                // 重置所有状态
                this.vue = null;
                this.tree = null;
                this.events = null;
                this.extension = null;

                // 移除全局引用
                window.hierarchy = null as any;
            }
        };

        return manager;
    }

    /**
     * 使用固定间隔重试初始化
     * @param maxAttempts 最大尝试次数
     * @param interval 重试间隔(毫秒)
     */
    async function retryInitialization(maxAttempts = 5, interval = 500): Promise<void> {
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const manager = createHierarchyManager();
                if (manager.init()) {
                    window.hierarchy = manager;
                    resolveHierarchyReady(true);
                    return;
                }
            } catch (error) {
                // 只在第一次尝试时输出详细日志
                if (attempts === 0) {
                    console.warn(`[hierarchy]`, `初始化尝试失败:`, error);
                }
            }

            attempts++;

            // 如果还有尝试次数，则等待指定间隔
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, interval));
                // 减少日志输出，只在第一次和最后一次尝试时输出
                // if (attempts === 1 || attempts === maxAttempts - 1) {
                //     console.info(`[hierarchy]`, `重试初始化 (${attempts + 1}/${maxAttempts})...`);
                // }
            }
        }

        // 所有尝试都失败，但不抛出错误，因为会在scene:ready时重试
        console.warn(`[hierarchy]`, `初始化未成功: 等待场景准备好后再次尝试`);
        resolveHierarchyReady(false);
    }

    // 开始初始化过程
    try {
        // 使用固定间隔重试，最多5次，每次间隔500ms
        // 减少初始尝试次数，因为我们有scene:ready作为备份
        await retryInitialization(5, 500);
    } catch (error) {
        console.error(`[hierarchy]`, '初始化过程中断:', error);
        // 不在这里调用resolveHierarchyReady，因为retryInitialization内部已经处理了
    }
})();