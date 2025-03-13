import { HierarchyEvents, HierarchyEventMap, HierarchyNode, HierarchyNodeData, ExtensionLifecycle, ExtensionOptions, ExtensionInstance, HierarchyManager, HierarchyTree } from './types';

(function () {
    /** 获取层级面板的Vue实例 */
    function getHierarchyDragArea() {
        // 1. 获取 dock-frame
        const dockFrame = document.getElementsByTagName("dock-frame")[0];
        if (!dockFrame?.shadowRoot) {
            console.warn('[Hierarchy] 未找到dock-frame');
            return null;
        }

        // 2. 获取 hierarchy 面板
        const panelFrames = dockFrame.shadowRoot.querySelectorAll("panel-frame");
        const hierarchyPanel = Array.from(panelFrames).find(panel => 
            panel.getAttribute("name") === "hierarchy"
        );
        
        if (!hierarchyPanel?.shadowRoot) {
            console.warn('[Hierarchy] 未找到hierarchy面板');
            return null;
        }

        // 3. 获取drag-area
        const dragArea = hierarchyPanel.shadowRoot.querySelector("ui-drag-area");
        if (!dragArea) {
            console.warn('[Hierarchy] 未找到drag-area');
            return null;
        }

        // 4. 获取Vue实例
        const vue = (dragArea as any).__vue__;
        if (!vue) {
            console.warn('[Hierarchy] 未找到Vue实例');
            return null;
        }

        // 5. 等待节点数据加载
        if (!vue.nodes?.length) {
            console.warn('[Hierarchy] 节点数据未加载');
            return null;
        }

        // 6. 打印节点信息
        console.log('[Hierarchy] 节点数据:', {
            nodes: vue.nodes.map((n: HierarchyNodeData) => ({
                uuid: n.uuid,
                name: n.name,
                type: n.type,
                parent: n.parent
            })),
            children: vue.$children.map((c: { uuid?: string; $el?: any }) => ({
                uuid: c.uuid,
                el: !!c.$el
            }))
        });

        return vue;
    }

    /** 创建事件系统 */
    function createEvents(): HierarchyEvents {
        const listeners = new Map<keyof HierarchyEventMap, Function[]>();
        
        return {
            listeners,
            emit<K extends keyof HierarchyEventMap>(event: K, ...args: Parameters<HierarchyEventMap[K]>) {
                const eventListeners = listeners.get(event) || [];
                eventListeners.forEach((fn: Function) => fn(...args));
            },
            on<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K]) {
                if (!listeners.has(event)) {
                    listeners.set(event, []);
                }
                listeners.get(event)!.push(callback);
            },
            off<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K]) {
                const eventListeners = listeners.get(event);
                if (eventListeners) {
                    const index = eventListeners.indexOf(callback);
                    if (index > -1) {
                        eventListeners.splice(index, 1);
                    }
                }
            },
            clear() {
                listeners.clear();
            }
        };
    }

    /** 创建节点树系统 */
    function createTree(): HierarchyTree {
        const nodeMap = new Map<string, HierarchyNode>();
        const rootNodes: HierarchyNode[] = [];

        return {
            nodeMap,
            rootNodes,
            getChildren(uuid: string) {
                return Array.from(nodeMap.values()).filter(node => node.parent === uuid);
            },
            getParent(uuid: string) {
                const node = nodeMap.get(uuid);
                return node ? nodeMap.get(node.parent) || null : null;
            },
            isParent(nodeUuid: string, parentUuid: string) {
                let currentNode = nodeMap.get(nodeUuid);
                while (currentNode) {
                    if (currentNode.parent === parentUuid) return true;
                    currentNode = nodeMap.get(currentNode.parent);
                }
                return false;
            },
            clear() {
                nodeMap.clear();
                rootNodes.length = 0;
            },
            addNode(node: HierarchyNode) {
                nodeMap.set(node.uuid, node);
                if (!node.parent) rootNodes.push(node);
            },
            removeNode(uuid: string) {
                const node = nodeMap.get(uuid);
                if (node) {
                    nodeMap.delete(uuid);
                    const rootIndex = rootNodes.indexOf(node);
                    if (rootIndex > -1) rootNodes.splice(rootIndex, 1);
                }
            }
        };
    }

    /** 创建扩展系统 */
    function createExtension(manager: HierarchyManager) {
        const extensions = new Map<string, ExtensionInstance>();
        let currentAssetId = '';
        let currentAssetType: 'scene' | 'prefab' = 'scene';
        let updateTimer: ReturnType<typeof setTimeout> | null = null;

        /** 添加扩展样式 */
        function addStyle(id: string, className: string, css?: string) {
            if (!css || !manager.vue?.$el) return;

            const styleId = `hierarchy-style-${id}`;
            let style = document.getElementById(styleId);
            
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                manager.vue.$el.appendChild(style);
            }
            
            style.textContent = css;
        }

        /** 移除扩展样式 */
        function removeStyle(id: string) {
            const style = document.getElementById(`hierarchy-style-${id}`);
            style?.remove();
        }

        /** 检查资源是否变化 */
        function checkAssetChange(vue: any) {
            if (!vue?.nodes?.length) {
                if (currentAssetId) {
                    currentAssetId = '';
                    currentAssetType = 'scene';
                    return true;
                }
                return false;
            }

            const firstNode = vue.nodes[0];
            const newAssetId = firstNode.type === "cc.Scene" 
                ? firstNode.uuid 
                : firstNode.prefab?.assetUuid || "";
            const newAssetType = firstNode.type === "cc.Scene" ? 'scene' : 'prefab';

            if (newAssetId !== currentAssetId) {
                currentAssetId = newAssetId;
                currentAssetType = newAssetType;
                return true;
            }

            return false;
        }

        return {
            add(options: ExtensionOptions): ExtensionInstance {
                if (extensions.has(options.id)) {
                    throw new Error(`Extension with id ${options.id} already exists`);
                }

                addStyle(options.id, options.className, options.style);
                options.lifecycle?.onInit?.();
                
                if (options.lifecycle?.onAssetChange && manager.events) {
                    manager.events.on('assetChange', options.lifecycle.onAssetChange);
                }

                const instance: ExtensionInstance = {
                    ...options,
                    destroy: () => {
                        options.lifecycle?.onDestroy?.();
                        if (options.lifecycle?.onAssetChange && manager.events) {
                            manager.events.off('assetChange', options.lifecycle.onAssetChange);
                        }
                        removeStyle(options.id);
                        extensions.delete(options.id);
                        manager.events?.emit('extensionRemoved', options.id);
                    }
                };

                extensions.set(options.id, instance);
                manager.events?.emit('extensionAdded', instance);
                this.updateAll();

                return instance;
            },

            get(id: string) {
                return extensions.get(id);
            },

            remove(id: string) {
                const instance = extensions.get(id);
                instance?.destroy();
            },

            getAll() {
                return Array.from(extensions.values());
            },

            updateAll() {
                if (updateTimer || !manager.vue) return;

                const vue = manager.vue;
                if (checkAssetChange(vue)) {
                    manager.events?.emit('assetChange', currentAssetId, currentAssetType);
                }

                vue.$children.forEach((vueNode: any) => {
                    const element = vueNode.$el as HTMLElement;
                    
                    extensions.forEach(extension => {
                        const visible = extension.isVisible(vueNode);
                        let container = element.querySelector(`.${extension.className}`) as HTMLElement | null;

                        if (!visible) {
                            container?.remove();
                            return;
                        }

                        if (visible && !container) {
                            container = document.createElement('div');
                            container.className = extension.className;
                            element.appendChild(container);
                            extension.onCreate(vueNode, container);
                        }

                        if (container && extension.onUpdate) {
                            extension.onUpdate(vueNode, container);
                        }
                    });
                });

                updateTimer = setTimeout(() => {
                    updateTimer = null;
                }, 0);
                
                manager.events?.emit('treeUpdate');
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

            refresh() {
                if (!this.vue || !this.tree) return;

                console.log('[Hierarchy] 开始刷新节点树');
                
                // 确保数据存在
                if (!this.vue.nodes?.length) {
                    console.warn('[Hierarchy] 无节点数据');
                    return;
                }

                this.tree.clear();
                
                // 处理所有节点
                for (const nodeData of this.vue.nodes) {
                    // 找到对应的Vue组件
                    const vueNode = this.vue.$children.find(child => {
                        const el = (child as any).$el as HTMLElement;
                        const childUuid = el?.dataset?.uuid || (child as any).uuid;
                        return childUuid === nodeData.uuid;
                    });

                    if (!vueNode) {
                        console.warn('[Hierarchy] 未找到节点组件:', {
                            uuid: nodeData.uuid,
                            name: nodeData.name,
                            availableChildren: this.vue.$children.map(c => ({
                                uuid: (c as any).uuid,
                                elUuid: ((c as any).$el as HTMLElement)?.dataset?.uuid
                            }))
                        });
                        continue;
                    }

                    const node: HierarchyNode = {
                        uuid: nodeData.uuid,
                        name: nodeData.name,
                        type: nodeData.type,
                        parent: nodeData.parent,
                        active: nodeData.active,
                        prefab: nodeData.prefab,
                        element: (vueNode as any).$el,
                        vueComponent: vueNode
                    };

                    console.log('[Hierarchy] 添加节点:', {
                        uuid: node.uuid,
                        name: node.name,
                        type: node.type,
                        hasElement: !!node.element,
                        hasVueComponent: !!node.vueComponent
                    });

                    this.tree.addNode(node);
                }

                console.log('[Hierarchy] 刷新完成:', {
                    nodes: this.tree.nodeMap.size,
                    roots: this.tree.rootNodes.length,
                    firstNode: this.tree.rootNodes[0]?.name
                });
                
                this.events?.emit('treeUpdate');
            },

            init() {
                const vue = getHierarchyDragArea();
                if (!vue) return false;

                this.vue = vue;
                this.tree = createTree();
                this.events = createEvents();
                this.extension = createExtension(this);

                this.vue!.$watch('nodes', () => {
                    this.refresh();
                    this.extension?.updateAll();
                });

                this.refresh();
                this.extension?.updateAll();
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
            }
        };

        return manager;
    }

    return new Promise<void>((resolve, reject) => {
        let retryCount = 0;
        const checkInterval = setInterval(() => {
            console.log(`[Hierarchy] 尝试初始化... (${retryCount + 1}/50)`);
            
            const manager = createHierarchyManager();
            if (manager.init()) {
                window.hierarchy = manager;
                clearInterval(checkInterval);
                console.log('[Hierarchy] 初始化成功');
                resolve();
                return;
            }

            if (++retryCount >= 50) {
                clearInterval(checkInterval);
                const error = new Error('层级管理器初始化超时');
                console.error('[Hierarchy] 初始化失败:', error);
                reject(error);
            }
        }, 200);
    });
})();