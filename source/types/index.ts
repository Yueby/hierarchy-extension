export { };

declare global {
    interface Window {
        hierarchyVue: HierarchyVue;
        hierarchyTree: HierarchyTree;
        refreshHierarchyTree: () => void;
        hierarchyExtension: HierarchyExtension;
        hierarchyEvents: HierarchyEvents;
    }
}

/** 扩展配置选项 */
export interface ExtensionOptions {
    /** 扩展的唯一标识符 */
    id: string;
    /** 扩展的CSS类名 */
    className: string;
    /** 扩展的生命周期钩子 */
    lifecycle?: ExtensionLifecycle;
    /** 扩展的样式 */
    style?: string;
    /** 扩展的可见性判断函数 */
    isVisible: (node: HierarchyNode) => boolean;
    /** 扩展的创建函数 */
    onCreate: (node: HierarchyNode, container: HTMLElement) => void;
    /** 扩展的更新函数 */
    onUpdate?: (node: HierarchyNode, container: HTMLElement) => void;
}

/** 扩展实例 */
export interface ExtensionInstance extends ExtensionOptions {
    /** 销毁函数 */
    destroy: () => void;
}

export type ExtensionData = [
    string,
    (data: HierarchyNode) => boolean,
    (data: HierarchyNode, container: HTMLElement) => void,
    ((data: HierarchyNode, container: HTMLElement) => void)?
];

export interface HierarchyVue {
    $el: HTMLElement;
    $children: HierarchyNode[];
    nodes: HierarchyNodeData[];
    $watch(key: string, callback: () => void): void;
}

export interface HierarchyTree {
    /** 当前节点树中的所有节点 */
    nodeMap: Map<string, HierarchyNode>;
    /** 根节点列表 */
    rootNodes: HierarchyNode[];
    /** 获取节点的子节点 */
    getChildren(uuid: string): HierarchyNode[];
    /** 获取节点的父节点 */
    getParent(uuid: string): HierarchyNode | null;
    /** 检查是否为父子关系 */
    isParent(nodeUuid: string, parentUuid: string): boolean;
}

export interface HierarchyNode {
    /** 节点唯一标识 */
    uuid: string;
    /** 父节点uuid */
    parent: string;
    /** 节点名称 */
    name: string;
    /** 节点类型 */
    type: string;
    /** 是否激活 */
    active: boolean;
    /** 对应的DOM元素 */
    element: HTMLElement;
    /** Vue组件实例引用 */
    vueComponent: any;
    /** 预制体信息（如果是预制体） */
    prefab?: {
        assetUuid: string;
    };
}

export interface HierarchyNodeData {
    uuid: string;
    parent: string;
    name: string;
    type: string;
    active: boolean;
    prefab?: {
        assetUuid: string;
    };
}

export interface HierarchyEvents {
    /** 事件监听器集合 */
    listeners: Map<keyof HierarchyEventMap, Function[]>;
    /** 触发事件 */
    emit<K extends keyof HierarchyEventMap>(event: K, ...args: Parameters<HierarchyEventMap[K]>): void;
    /** 添加事件监听 */
    on<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K]): void;
    /** 移除事件监听 */
    off<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K]): void;
}

export interface HierarchyEventMap {
    /** 场景/预制体切换事件 */
    onAssetChange: (assetId: string, assetType: 'scene' | 'prefab') => void;
    /** 节点树更新事件 */
    onTreeUpdate: () => void;
    /** 扩展添加事件 */
    onExtensionAdded: (extension: ExtensionInstance) => void;
    /** 扩展移除事件 */
    onExtensionRemoved: (extensionId: string) => void;
}

export interface ExtensionLifecycle {
    /** 扩展初始化时调用 */
    onInit?: () => void;
    /** 扩展销毁时调用 */
    onDestroy?: () => void;
    /** 场景切换时调用 */
    onAssetChange?: (assetId: string, assetType: 'scene' | 'prefab') => void;
}

export interface HierarchyExtension {
    /** 添加扩展 */
    add(options: ExtensionOptions): ExtensionInstance;
    /** 获取扩展 */
    get(id: string): ExtensionInstance | undefined;
    /** 删除扩展 */
    remove(id: string): void;
    /** 获取所有扩展 */
    getAll(): ExtensionInstance[];
    /** 更新所有扩展 */
    updateAll(): void;
}