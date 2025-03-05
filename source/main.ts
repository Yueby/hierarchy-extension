import path from "path";
import fs from "fs";
import { WebContents, BrowserWindow } from "electron";

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

    async onSceneReady() {
        injectHierarchyApp();
    },

    async onSceneChangeNode(uuid: string) {
        let webContents = getMainWebContents();
        if (!webContents) {
            return;
        }

        console.log("onSceneChangeNode", uuid);
        webContents.executeJavaScript(JSON.stringify(
            `
            (()=>{
                if(window.hierarchyApp){
                    window.hierarchyApp.handleSceneChangeNode(${uuid});
                }
            })();
            `
        ));
    }
};

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export function load() {
    injectHierarchyApp();
}

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export function unload() {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return;
    }

    try {
        webContents.executeJavaScript(JSON.stringify(
            `
            (()=>{
                if(window.hierarchyApp){
                    window.hierarchyApp.destroy();
                }
            })();
            `
        ));
    } catch (error) {
        console.error("执行脚本时出错:", error);
    }
}

function injectHierarchyApp() {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return;
    }
    injectScript(webContents);
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

function getScript() {
    const hackScriptPath = path.join(__dirname, 'hack.js');
    const script = fs.readFileSync(hackScriptPath, 'utf-8');
    return script;
}

function injectScript(webContents: WebContents | null) {
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return;
    }

    try {
        const script = getScript();
        webContents.executeJavaScript(script).then(() => {
            console.log("脚本注入成功");
        }).catch((error) => {
            console.error("脚本执行失败:", error);
        });
    } catch (error) {
        console.error("注入脚本时出错:", error);
    }
}



