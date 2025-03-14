import fs from "fs";
import { WebContents, BrowserWindow } from "electron";
import path from "path";

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
        if (uuids.length <= 0) return;

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
export function load() {
    inject();
}

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export function unload() {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.error("清理失败: webContents 为空");
        return;
    }

    // 执行清理脚本
    webContents.executeJavaScript(`
        if (window.hierarchy) {
            window.hierarchy.cleanup();
        }
    `).catch(error => console.error('清理失败:', error));
}

function inject(): void {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.error("注入失败: webContents 为空");
        return;
    }

    // 读取并合并所有必要的文件
    const utils = fs.readFileSync(path.join(__dirname, 'utils.js'), 'utf-8');
    const hierarchyInit = fs.readFileSync(path.join(__dirname, 'hierarchy-init.js'), 'utf-8');
    const nodeActivator = fs.readFileSync(path.join(__dirname, 'extensions/node-activator.js'), 'utf-8');
    const headerNode = fs.readFileSync(path.join(__dirname, 'extensions/header-node.js'), 'utf-8');
    
    // 构建注入脚本
    const injectScript = `
    (async () => {
        try {
            ${utils}
            ${hierarchyInit}
            ${nodeActivator}
            ${headerNode}
            return true;
        } catch (error) {
            console.error('[Hierarchy] 注入失败:', error);
            return false;
        }
    })()`;

    webContents.executeJavaScript(injectScript)
        .catch(error => console.error('注入失败:', error));
}

function getMainWebContents(): WebContents | null {
    for (const win of BrowserWindow.getAllWindows()) {
        try {
            const url = win.webContents.getURL();
            const title = win.getTitle() || '';
            if (url.includes('windows/main.html') || title.includes('Cocos Creator')) {
                return win.webContents;
            }
        } catch (error) {
            console.error('获取窗口信息时出错:', error);
        }
    }
    console.error("未找到Cocos Creator主窗口");
    return null;
}

