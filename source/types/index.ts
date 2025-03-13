export { };

/** 层级管理器接口 */
export interface HierarchyManager {
    /** Vue实例 */
    vue: HierarchyVue | null;
    /** 节点树管理 */
    tree: HierarchyTree | null;
    /** 事件系统 */
    events: HierarchyEvents | null;
    /** 扩展系统 */
    extension: HierarchyExtension | null;
    /** 刷新节点树 */
    refresh(): void;
    /** 初始化管理器 */
    init(): boolean;
    /** 销毁管理器 */
    destroy(): void;
}

declare global {
    interface Window {
        hierarchy: HierarchyManager;
    }
}

/** 基础节点数据 */
export interface HierarchyNodeData {
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
    /** 预制体信息（如果是预制体） */
    prefab?: {
        assetUuid: string;
    };
    /** DOM元素引用 */
    $el?: HTMLElement;
    /** Vue实例引用 */
    __vue__?: any;
}

/** 完整节点信息 */
export interface HierarchyNode extends HierarchyNodeData {
    /** 对应的DOM元素 */
    element: any;
    /** Vue组件实例引用 */
    vueComponent: any;
}

export interface HierarchyVue {
    /** DOM元素 */
    $el: HTMLElement;
    /** 子节点 */
    $children: HierarchyNode[];
    /** 节点数据 */
    nodes: HierarchyNodeData[];
    /** 监听属性变化 */
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
    /** 清空树 */
    clear(): void;
    /** 添加节点 */
    addNode(node: HierarchyNode): void;
    /** 移除节点 */
    removeNode(uuid: string): void;
}

export interface HierarchyEventMap {
    /** 场景/预制体切换事件 */
    assetChange: (assetId: string, assetType: 'scene' | 'prefab') => void;
    /** 节点树更新事件 */
    treeUpdate: () => void;
    /** 扩展添加事件 */
    extensionAdded: (extension: ExtensionInstance) => void;
    /** 扩展移除事件 */
    extensionRemoved: (extensionId: string) => void;
    /** 初始化完成事件 */
    initialized: () => void;
    /** 销毁事件 */
    destroy: () => void;
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
    /** 清空所有监听器 */
    clear(): void;
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

/** 扩展生命周期 */
export interface ExtensionLifecycle {
    /** 扩展初始化时调用 */
    onInit?: () => void;
    /** 扩展销毁时调用，对应 HierarchyEventMap.destroy */
    onDestroy?: HierarchyEventMap['destroy'];
    /** 场景切换时调用，对应 HierarchyEventMap.assetChange */
    onAssetChange?: HierarchyEventMap['assetChange'];
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
    /** 清空所有扩展 */
    clear(): void;
}