export class NodeTree {
    private _hierarchyVue: any;

    constructor() {
    }

    /**
     * @zh 在主进程中调用，设置 Vue 实例
     */
    public setHierarchyVue(vue: any) {
        this._hierarchyVue = vue;
        console.log('设置 hierarchyVue:', this._hierarchyVue);
    }

    /**
     * @zh 获取编辑器 document
     */
    public getDocument(): Document | null {
        if (!this._hierarchyVue) {
            console.warn('hierarchyVue 未初始化');
            return null;
        }

        // 通过 Vue 实例获取 document
        return this._hierarchyVue.$el?.ownerDocument || null;
    }

    /**
     * @zh 获取层级管理器面板
     */
    public getHierarchyPanel(): Element | null {
        const doc = this.getDocument();
        if (!doc) return null;

        const panelMap = new Map<string, Element>();
        const panelList = doc
            ?.getElementsByTagName("dock-frame")[0]
            ?.shadowRoot?.querySelectorAll("panel-frame");

        panelList?.forEach((v) => {
            const name = v.getAttribute("name");
            if (!name) return;
            console.log("name", name);
            panelMap.set(name, v);
        });

        return panelMap.get("hierarchy") || null;
    }

    /**
     * @zh 在编辑器窗口中执行的初始化函数
     */
    public init(document: Document): any {
        const panelMap = new Map<string, Element>();

        const panelList = document
            ?.getElementsByTagName("dock-frame")[0]
            ?.shadowRoot?.querySelectorAll("panel-frame");

        panelList?.forEach((v) => {
            const name = v.getAttribute("name");
            if (!name) return;
            console.log("name", name);
            panelMap.set(name, v);
        });

        const dragArea = panelMap.get("hierarchy")
            ?.shadowRoot?.querySelectorAll("ui-drag-area")[0];

        if (!dragArea) return null;
        console.log('dragArea', dragArea);
        return (dragArea as any).__vue__;
    }
}

export const nodeTree = new NodeTree();