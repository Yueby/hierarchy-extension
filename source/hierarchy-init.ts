import { HierarchyEvents, HierarchyEventMap, HierarchyNode, ExtensionLifecycle, ExtensionOptions, ExtensionInstance } from './types';

(function () {
    // 添加调试函数
    function debugLog(title: string, ...args: any[]) {
        console.group(`🔍 ${title}`);
        args.forEach((arg, index) => {
            console.log(`${index + 1}.`, arg);
            if (arg && typeof arg === 'object') {
                console.dir(arg);
            }
        });
        console.groupEnd();
    }

    function getHierarchyDragArea() {
        console.log('dock-frame:', document.getElementsByTagName("dock-frame")[0]);

        const panelMap = new Map<string, Element>();
        const panelList = document.getElementsByTagName("dock-frame")[0]
            .shadowRoot?.querySelectorAll("panel-frame");

        console.log('panelList:', panelList);

        panelList?.forEach((v) => {
            const name = v.getAttribute("name");
            if (!name) return;
            panelMap.set(name, v);
        });

        console.log('panelMap:', panelMap);

        const dragArea = panelMap.get("hierarchy")
            ?.shadowRoot?.querySelectorAll("ui-drag-area")[0];

        console.log('dragArea:', dragArea, 'vue:', dragArea && (dragArea as any).__vue__);

        if (!dragArea) return null;
        return (dragArea as any).__vue__;
    }

    function initHierarchyTree() {
        const nodeMap = new Map<string, HierarchyNode>();

        const hierarchyTree = {
            nodeMap,
            rootNodes: [] as HierarchyNode[],

            getChildren(uuid: string) {
                const children: HierarchyNode[] = [];
                this.nodeMap.forEach(node => {
                    if (node.parent === uuid) {
                        children.push(node);
                    }
                });
                return children;
            },

            getParent(uuid: string) {
                const node = this.nodeMap.get(uuid);
                if (!node) return null;
                return this.nodeMap.get(node.parent) || null;
            },

            isParent(nodeUuid: string, parentUuid: string) {
                let currentNode = this.nodeMap.get(nodeUuid);
                while (currentNode) {
                    if (currentNode.parent === parentUuid) {
                        return true;
                    }
                    currentNode = this.nodeMap.get(currentNode.parent);
                }
                return false;
            }
        };

        return hierarchyTree;
    }

    function updateHierarchyTree() {
        const vue = window.hierarchyVue;
        const tree = window.hierarchyTree;

        if (!vue || !tree) return;

        // 清空现有数据
        tree.nodeMap.clear();
        tree.rootNodes = [];

        // 更新节点数据
        vue.$children.forEach((vueNode: any) => {
            const nodeData = vue.nodes.find(n => n.uuid === vueNode.uuid);
            if (!nodeData) return;

            const node: HierarchyNode = {
                ...nodeData,
                element: vueNode.$el,
                vueComponent: vueNode
            };

            tree.nodeMap.set(node.uuid, node);
            if (!node.parent) {
                tree.rootNodes.push(node);
            }
        });
    }

    let updateTimer: ReturnType<typeof setTimeout> | null = null;

    function initHierarchyEvents(): HierarchyEvents {
        const events: HierarchyEvents = {
            listeners: new Map<keyof HierarchyEventMap, Function[]>(),
            
            emit<K extends keyof HierarchyEventMap>(event: K, ...args: Parameters<HierarchyEventMap[K]>) {
                const listeners = this.listeners.get(event) || [];
                listeners.forEach((fn: Function) => fn(...args));
            },
            
            on<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K]) {
                if (!this.listeners.has(event)) {
                    this.listeners.set(event, []);
                }
                this.listeners.get(event)!.push(callback);
            },
            
            off<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K]) {
                const listeners = this.listeners.get(event);
                if (listeners) {
                    const index = listeners.indexOf(callback);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            }
        };

        return events;
    }

    function initHierarchyExtension() {
        const extensions = new Map<string, ExtensionInstance>();
        let currentAssetId = '';
        let currentAssetType: 'scene' | 'prefab' = 'scene';

        function addStyle(id: string, className: string, css?: string) {
            if (!css) return;
            
            const vue = window.hierarchyVue;
            if (!vue) return;

            const root = vue.$el;
            const styleId = `hierarchy-style-${id}`;
            let style = document.getElementById(styleId);
            
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                root.appendChild(style);
            }
            
            style.textContent = css;
        }

        function removeStyle(id: string) {
            const styleId = `hierarchy-style-${id}`;
            const style = document.getElementById(styleId);
            style?.remove();
        }

        const extension = {
            add(options: ExtensionOptions): ExtensionInstance {
                if (extensions.has(options.id)) {
                    throw new Error(`Extension with id ${options.id} already exists`);
                }

                // 添加样式
                addStyle(options.id, options.className, options.style);

                // 初始化生命周期
                options.lifecycle?.onInit?.();
                
                if (options.lifecycle?.onAssetChange) {
                    window.hierarchyEvents.on('onAssetChange', options.lifecycle.onAssetChange);
                }

                // 创建扩展实例
                const instance: ExtensionInstance = {
                    ...options,
                    destroy: () => {
                        options.lifecycle?.onDestroy?.();
                        if (options.lifecycle?.onAssetChange) {
                            window.hierarchyEvents.off('onAssetChange', options.lifecycle.onAssetChange);
                        }
                        removeStyle(options.id);
                        extensions.delete(options.id);
                        window.hierarchyEvents.emit('onExtensionRemoved', options.id);
                    }
                };

                extensions.set(options.id, instance);
                window.hierarchyEvents.emit('onExtensionAdded', instance);
                this.updateAll();

                return instance;
            },

            get(id: string) {
                return extensions.get(id);
            },

            remove(id: string) {
                const instance = extensions.get(id);
                if (instance) {
                    instance.destroy();
                }
            },

            getAll() {
                return Array.from(extensions.values());
            },

            updateAll() {
                if (updateTimer) return;
                
                const vue = window.hierarchyVue;
                if (!vue) return;

                vue.$children.forEach((vueNode: any) => {
                    const element = vueNode.$el as HTMLElement;
                    
                    // 检查资源是否变化
                    const newAssetId = !vue.nodes.length 
                        ? "" 
                        : vue.nodes[0].type === "cc.Scene" 
                            ? vue.nodes[0].uuid 
                            : vue.nodes[0].prefab?.assetUuid || "";
                    
                    const newAssetType = vue.nodes[0]?.type === "cc.Scene" ? 'scene' : 'prefab';
                    
                    if (newAssetId !== currentAssetId) {
                        currentAssetId = newAssetId;
                        currentAssetType = newAssetType;
                        window.hierarchyEvents.emit('onAssetChange', currentAssetId, currentAssetType);
                    }
                    
                    // 更新所有扩展
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
                
                window.hierarchyEvents.emit('onTreeUpdate');
            }
        };

        return extension;
    }

    // 初始化前记录window状态
    console.log('初始化前 window:', {
        hierarchyVue: window.hierarchyVue,
        hierarchyTree: window.hierarchyTree,
        hierarchyEvents: window.hierarchyEvents,
        hierarchyExtension: window.hierarchyExtension
    });

    // 初始化
    window.hierarchyVue = getHierarchyDragArea();
    window.hierarchyTree = initHierarchyTree();
    window.hierarchyEvents = initHierarchyEvents();
    window.hierarchyExtension = initHierarchyExtension();
    window.refreshHierarchyTree = updateHierarchyTree;

    // 初始化后记录window状态
    console.log('初始化后 window:', {
        hierarchyVue: window.hierarchyVue,
        hierarchyTree: window.hierarchyTree,
        hierarchyEvents: window.hierarchyEvents,
        hierarchyExtension: window.hierarchyExtension
    });

    // 监听节点变化并更新树结构
    if (window.hierarchyVue) {
        window.hierarchyVue.$watch('nodes', () => {
            console.log('节点变化:', {
                hierarchyVue: window.hierarchyVue,
                hierarchyTree: window.hierarchyTree
            });
            window.refreshHierarchyTree();
            window.hierarchyExtension.updateAll();
        });

        // 初始更新
        window.refreshHierarchyTree();
        window.hierarchyExtension.updateAll();
    }

})();