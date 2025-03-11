(() => {

    const { nodeTree } = require('./nodeTree.js');
    console.log('nodeTree', nodeTree.init(document));

    const dockFrame = document.getElementsByTagName("dock-frame")[0];
    if (!dockFrame || !dockFrame.shadowRoot) {
        return 'No dock-frame found or no shadowRoot';
    }

    const panels = dockFrame.shadowRoot.querySelectorAll("panel-frame");
    const hierarchyPanel = Array.from(panels).find(panel => panel.getAttribute('name') === 'hierarchy');

    if (!hierarchyPanel || !hierarchyPanel.shadowRoot) {
        return 'No hierarchy panel found or no shadowRoot';
    }

    const dragArea = hierarchyPanel.shadowRoot.querySelector('ui-drag-area');
    if (!dragArea) {
        return 'No drag area found';
    }

    // 将Vue实例存储在window上
    window.hierarchyVue = (dragArea as any).__vue__;

    // 返回一些可以序列化的信息
    const vue = window.hierarchyVue;
    return {
        success: true,
        message: 'Vue实例已存储在window.hierarchyVue上',
        info: {
            hasEl: !!vue.$el,
            elTagName: vue.$el?.tagName,
            elClassName: vue.$el?.className,
            nodeTree: nodeTree
        }
    };
})();