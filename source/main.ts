/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any; } = {

    /**
     * @en Open the panel
     * @zh 打开面板
     */
    openPanel() {
        Editor.Panel.open('hierarchy-extension.default');
    },

    /**
     * @en Set the active state of the selected node
     * @zh 设置选中的节点的激活状态
     */
    async setNodeActive() {
        const uuids = Editor.Selection.getSelected('node');

        if (uuids.length <= 0) {
            return;
        }

        for (let nodeUuid of uuids) {
            const nodeInfo = await Editor.Message.request('scene', 'query-node', nodeUuid);

            await Editor.Message.request('scene', 'set-property', {
                uuid: nodeUuid,
                path: 'active',
                dump: {
                    type: 'Boolean',
                    value: !nodeInfo.active.value
                }
            });
        }
    }

};

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export function load() { }

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export async function unload() { }

