/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any; } = {

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
    },

};

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export async function load() {
    const contents = await getEditorWindow();
    if (!contents) {
        console.warn('未找到编辑器窗口');
        return;
    }

    try {
        const hackScript = require('./hack');
        const result = await executeInEditor(hackScript);
        console.log('初始化结果:', result);
    } catch (error) {
        console.error('执行脚本失败:', error);
    }
}

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export async function unload() { }

/**
 * @zh 获取编辑器窗口
 */
async function getEditorWindow(): Promise<Electron.BrowserWindow | null> {
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();

    for (const win of windows) {
        try {
            const url = win.webContents.getURL();
            const title = win.getTitle() || '';

            // 判断是否是主窗口
            if (
                url.includes('windows/main.html') ||    // 主窗口URL
                title.includes('Cocos Creator')         // 主窗口标题
            ) {
                return win;
            }
        } catch (error) {
            console.warn('获取窗口信息失败:', error);
            continue;
        }
    }

    console.warn('未找到 Cocos Creator 编辑器窗口');
    return null;
}

/**
 * @zh 在编辑器窗口中执行脚本
 */
async function executeInEditor<T>(script: string): Promise<T | null> {
    const window = await getEditorWindow();
    if (!window) {
        return null;
    }

    try {
        return await window.webContents.executeJavaScript(script);
    } catch (error) {
        console.error('在编辑器窗口执行脚本失败:', error);
        return null;
    }
}

