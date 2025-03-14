export { };

export type HTMLCustomElement<T extends {} = Record<string, any>> = HTMLElement & T;

/** Vue组件实例接口 */
export interface TreeNodeVueComponent {
    $el: HTMLElement;
    $props: {
        node: TreeNode;
    };
}

/** 预制体状态 */
export interface PrefabState {
    state: number;
    isUnwrappable: boolean;
    isRevertable: boolean;
    isApplicable: boolean;
    isAddedChild: boolean;
    assetUuid: string;
}

/** 节点数据 */
export interface TreeNode {
    /** 节点名称 */
    name: string;
    /** 是否激活 */
    active: boolean;
    /** 是否锁定 */
    locked?: boolean;
    /** 节点类型 */
    type: string;
    /** 唯一标识 */
    uuid: string;
    /** 父节点uuid */
    parent: string;
    /** 节点路径 */
    path?: string;
    /** 是否是场景节点 */
    isScene?: boolean;
    /** 是否只读 */
    readonly?: boolean;
    /** 组件列表 */
    components: any[];
    /** 是否是预制体根节点 */
    isPrefabRoot?: boolean;
    /** 节点深度 */
    depth?: number;
    /** 层级字符串 */
    level?: string;
    /** 额外数据 */
    additional?: Record<string, unknown>;
    /** 预制体信息 */
    prefab?: PrefabState;
    /** 子节点列表 */
    children: TreeNode[];
    /** Vue组件实例引用 */
    vueComponent?: TreeNodeVueComponent;
}

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
    /** 内部刷新实现 */
    _doRefresh(): void;
    /** 初始化管理器 */
    init(): boolean;
    /** 销毁管理器 */
    destroy(): void;
    /** 验证节点层次结构 */
    /** 获取节点层次结构信息 */
    getNodeHierarchyInfo(node: TreeNode): any;
    /** 清理所有注入内容 */
    cleanup(): void;
    /** 根据uuid获取节点的DOM元素 */
    getElement(uuid: string): HTMLElement | undefined;
    /** 根据uuid获取节点的Vue组件实例 */
    getVueComponent(uuid: string): TreeNodeVueComponent | undefined;
    /** 根据uuid获取节点数据 */
    getNode(uuid: string): TreeNode | undefined;
}

/** 日志级别类型 */
export type LogLevelType = 0 | 1 | 2 | 3;

/** 日志级别常量 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
} as const;

export interface Utils {
    LogLevel: typeof LogLevel;
    log(level: LogLevelType, tag: string, ...args: any[]): void;
    debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void;
    throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void;
    safeQuerySelector<T extends Element>(selector: string, parent?: Element | Document): T | null;
    appendChildren(parent: Element, children: Element[]): void;
    waitForCondition(condition: () => boolean, timeout?: number, interval?: number): Promise<void>;
    exponentialRetry<T>(fn: () => Promise<T>, maxRetries?: number, initialDelay?: number): Promise<T>;
}

declare global {
    interface Window {
        utils: Utils;
        hierarchy: HierarchyManager;
    }
}

/** Vue组件实例接口 */
export interface HierarchyVue {
    /** DOM元素 */
    $el: HTMLElement;
    /** 节点数据 */
    nodes: TreeNode[];
    /** 子组件列表 */
    $children?: Array<TreeNodeVueComponent>;
    /** 监听属性变化 */
    $watch(key: string, callback: () => void): void;
}

export interface HierarchyTree {
    /** 当前节点树中的所有节点 */
    nodeMap: Map<string, TreeNode>;
    /** 清空树 */
    clear(): void;
    /** 添加节点 */
    addNode(node: TreeNode): void;
    /** 移除节点 */
    removeNode(uuid: string): void;
    /** 获取节点 */
    getNode(uuid: string): TreeNode | undefined;
    /** 获取节点总数 */
    getNodeCount(): number;
}

/** 事件选项 */
export interface HierarchyEventOptions {
    /** 事件优先级 */
    priority?: number;
    /** 是否只触发一次 */
    once?: boolean;
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
    on<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K], options?: HierarchyEventOptions): void;
    /** 移除事件监听 */
    off<K extends keyof HierarchyEventMap>(event: K, callback: HierarchyEventMap[K]): void;
    /** 清空所有监听器 */
    clear(): void;
}

/** 扩展配置选项 */
export interface ExtensionOptions {
    /** 扩展ID */
    id: string;
    /** 扩展的样式类名 */
    className: string;
    /** 扩展优先级 */
    priority?: number;
    /** 是否显示扩展 */
    isVisible?: (node: TreeNode) => boolean;
    /** 创建扩展UI */
    onCreate?: (node: TreeNode, element: HTMLElement) => void;
    /** 更新扩展UI */
    onUpdate?: (node: TreeNode, element: HTMLElement) => void;
    /** 销毁扩展UI */
    onDestroy?: (node?: TreeNode) => void;
}

/** 扩展实例 */
export type ExtensionInstance = ExtensionOptions;

export interface HierarchyExtension {
    /** 添加扩展 */
    add(options: ExtensionOptions): void;
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

/** 工具函数集合 */
export interface HierarchyUtils {
    log: (level: LogLevelType, tag: string, ...args: any[]) => void;
    LogLevel: typeof LogLevel;
    debounce: <T extends (...args: any[]) => any>(
        fn: T,
        wait: number
    ) => (...args: Parameters<T>) => void;
    waitForCondition: (
        condition: () => boolean,
        timeout?: number,
        interval?: number
    ) => Promise<void>;
    exponentialRetry: <T>(
        fn: () => Promise<T>,
        maxRetries?: number,
        initialDelay?: number
    ) => Promise<T>;
    createStyle: (id: string, css: string) => HTMLStyleElement;
    safeQuerySelector: <T extends Element>(selector: string, parent?: Element | Document) => T | null;
    appendChildren: (parent: Element, children: Element[]) => void;
    setLogLevel: (level: LogLevelType) => void;
    throttle: <T extends (...args: any[]) => any>(fn: T, limit: number) => (...args: Parameters<T>) => void;
}