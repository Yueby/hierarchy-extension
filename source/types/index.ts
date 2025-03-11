export {};

declare global {
    interface Window {
        hierarchyVue: HierarchyVue;
    }
}

export interface HierarchyVue {
    // 这里可以定义Vue实例的具体类型
    $el: HTMLElement;
    // ... 其他属性
}