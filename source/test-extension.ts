import { ExtensionOptions, HierarchyNode } from './types';

(function () {
    // 创建测试扩展配置
    const testExtension: ExtensionOptions = {
        id: 'test-extension',
        className: 'hierarchy-test',

        style: `
            .hierarchy-test {
                position: absolute;
                right: 24px;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                gap: 4px;
            }
            .hierarchy-test button {
                padding: 2px 4px;
                font-size: 12px;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 2px;
                background: white;
            }
            .hierarchy-test button:hover {
                background: #f0f0f0;
            }
            .hierarchy-test .info {
                font-size: 12px;
                color: #666;
            }
        `,

        lifecycle: {
            onInit() {
                console.log('[Test Extension] 初始化');

                window.hierarchy.events?.on('treeUpdate', () => {
                    const tree = window.hierarchy.tree;
                    if (!tree) return;

                    console.log('[Test Extension] 节点树更新:', {
                        nodeCount: tree.nodeMap.size,
                        rootCount: tree.rootNodes.length,
                        roots: tree.rootNodes.map(n => ({
                            name: n.name,
                            type: n.type,
                            children: tree.getChildren(n.uuid).length
                        }))
                    });
                });

                window.hierarchy.events?.on('assetChange', (assetId, assetType) => {
                    console.log('[Test Extension] 资源切换:', { 
                        assetId, 
                        assetType,
                        nodeCount: window.hierarchy.tree?.nodeMap.size || 0
                    });
                });
            },
            onAssetChange(assetId: string, assetType: 'scene' | 'prefab') {
                console.log('扩展接收到资源切换:', { assetId, assetType });
            },
            onDestroy() {
                console.log('测试扩展销毁');
            }
        },

        isVisible: (node: HierarchyNode) => {
            return !node.prefab;
        },

        onCreate(node: HierarchyNode, container: HTMLElement) {
            // 验证节点数据
            if (!node || !node.uuid) {
                console.error('[Test Extension] 无效的节点数据:', node);
                return;
            }

            const info = document.createElement('div');
            info.className = 'info';
            info.textContent = `[${node.type}]`;

            const childrenBtn = document.createElement('button');
            childrenBtn.textContent = '子节点';
            childrenBtn.onclick = (e) => {
                e.stopPropagation();
                const children = window.hierarchy.tree?.getChildren(node.uuid);
                console.log('[Test Extension] 子节点:', children?.length || 0, children);
            };

            const parentBtn = document.createElement('button');
            parentBtn.textContent = '父节点';
            parentBtn.onclick = (e) => {
                e.stopPropagation();
                const parent = window.hierarchy.tree?.getParent(node.uuid);
                console.log('[Test Extension] 父节点:', parent?.uuid || 'null', parent);
            };

            const propsBtn = document.createElement('button');
            propsBtn.textContent = '属性';
            propsBtn.onclick = (e) => {
                e.stopPropagation();
                console.log('[Test Extension] 节点属性:', {
                    uuid: node.uuid,
                    name: node.name,
                    type: node.type,
                    active: node.active,
                    parent: node.parent,
                    hasElement: !!node.element,
                    hasVueComponent: !!node.vueComponent
                });
            };

            container.appendChild(info);
            container.appendChild(childrenBtn);
            container.appendChild(parentBtn);
            container.appendChild(propsBtn);
        },

        onUpdate(node: HierarchyNode, container: HTMLElement) {
            if (!node || !node.uuid) {
                console.error('[Test Extension] 无效的节点数据:', node);
                return;
            }

            const info = container.querySelector('.info');
            if (info) {
                info.textContent = `[${node.type}]${node.active ? '' : ' (未激活)'}`;
            }
        }
    };

    // 等待层级管理器初始化并注册扩展
    const checkInterval = setInterval(() => {
        if (window.hierarchy?.extension) {
            clearInterval(checkInterval);

            // 添加测试扩展
            const extension = window.hierarchy.extension.add(testExtension);

            // 输出初始状态
            console.log('测试扩展已加载:', {
                vue: window.hierarchy.vue,
                tree: {
                    nodeCount: window.hierarchy.tree?.nodeMap.size,
                    rootNodes: window.hierarchy.tree?.rootNodes
                },
                events: window.hierarchy.events?.listeners,
                extensions: window.hierarchy.extension?.getAll()
            });
        }
    }, 100);
})(); 