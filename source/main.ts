
import fs from "fs";
import { WebContents, BrowserWindow } from "electron";
import path from "path";
import { electron } from "process";

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

    async sceneReady(uuid: string) {
        console.log("document", (globalThis as any).document);
    }
};

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export function load() {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return;
    }


    const nodeTreeScript = fs.readFileSync(path.join(__dirname, 'nodeTree.js'), 'utf-8');
    const hackScript = fs.readFileSync(path.join(__dirname, 'hack.js'), 'utf-8');

    webContents.executeJavaScript(`
        (function() {
            ${hackScript}
        })();
      `);


}

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export function unload() {
}

function getMainWebContents(): WebContents | null {
    let allwins = BrowserWindow.getAllWindows();


    for (let i = 0; i < allwins.length; i++) {
        const win = allwins[i];
        try {
            const url = win.webContents.getURL();
            const title = win.getTitle() || '';

            if (url.includes('windows/main.html') || title.includes('Cocos Creator')) {

                return win.webContents;
            }
        } catch (error) {
            console.error(`获取窗口 ${i} 信息时出错:`, error);
        }
    }
    console.warn("未找到Cocos Creator主窗口");
    return null;
}


