export class NodeTree {
    private _hierarchyVue: any;

    constructor() {

    }

    public init(): void {
        console.log(globalThis.document.getElementsByTagName("dock-frame"));
        let panelMap = new Map<string, Element>();

        let panelList = globalThis?.document
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

        if (!dragArea) return;

        this._hierarchyVue = (dragArea as any).__vue__;

        console.log(this._hierarchyVue);
    }
}

export const nodeTree = new NodeTree();