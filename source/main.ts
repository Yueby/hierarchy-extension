import path from "path";
import fs from "fs";
import { WebContents, BrowserWindow } from "electron";

// 应用状态管理
class HierarchyAppState {
    private static instance: HierarchyAppState;
    private _isReady: boolean = false;
    private _readyPromise: Promise<void>;
    private _readyResolve!: () => void;

    private constructor() {
        this._readyPromise = new Promise((resolve) => {
            this._readyResolve = resolve;
        });
    }

    static getInstance(): HierarchyAppState {
        if (!HierarchyAppState.instance) {
            HierarchyAppState.instance = new HierarchyAppState();
        }
        return HierarchyAppState.instance;
    }

    get isReady(): boolean {
        return this._isReady;
    }

    async waitUntilReady(): Promise<void> {
        if (this._isReady) return;
        await this._readyPromise;
    }

    markAsReady(): void {
        this._isReady = true;
        this._readyResolve();
    }

    reset(): void {
        this._isReady = false;
        this._readyPromise = new Promise((resolve) => {
            this._readyResolve = resolve;
        });
    }
}

let messageResult = {
    scene: {
        uuid: "",
        nodeChange: {
            uuid: ""
        }
    },
};

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

    // 添加消息处理方法
    'hierarchy-app-ready'() {
        HierarchyAppState.getInstance().markAsReady();
    },

    async onSceneShowLoading() {
        if (!HierarchyAppState.getInstance().isReady) {
            console.log("onSceneShowLoading: 应用未就绪");
            return;
        }
        await destoryVueApp();
    },

    async onSceneReady(uuid: string) {
        if (!HierarchyAppState.getInstance().isReady) {
            console.log("onSceneReady: 应用未就绪");
            return;
        }

        messageResult.scene.uuid = uuid;
        console.log("onSceneReady", uuid);
        await execJsInHierarchyApp(getMainWebContents(), `
            window.hierarchyApp.handleSceneReady("${uuid}");
        `);
    },

    async onReferenceImageShow() {
        const appState = HierarchyAppState.getInstance();
        if (!appState.isReady) {
            console.log("onReferenceImageShow: 注入应用");
            await injectHierarchyApp();
            return;
        }

        console.log("onReferenceImageShow", messageResult.scene.uuid);
        await execJsInHierarchyApp(getMainWebContents(), `
            window.hierarchyApp.handleReferenceImageShow("${messageResult.scene.uuid}");
        `);
    },

    async onSceneChangeNode(uuid: string) {
        if (!HierarchyAppState.getInstance().isReady) {
            console.log("onSceneChangeNode: 应用未就绪");
            return;
        }

        messageResult.scene.nodeChange.uuid = uuid;
        console.log("onSceneChangeNode", uuid);
        await execJsInHierarchyApp(getMainWebContents(), `
            window.hierarchyApp.handleSceneChangeNode("${uuid}");
        `);
    },

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
export async function unload() {
    await destoryVueApp();
    HierarchyAppState.getInstance().reset();
}

async function injectHierarchyApp(): Promise<WebContents | null> {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return null;
    }

    await injectScript(webContents);
    return webContents;
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

async function injectScript(webContents: WebContents | null) {
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return;
    }

    try {
        const script = getScript();
        await execJs(webContents, script, { jsonify: false, message: { success: "脚本注入成功", error: "脚本执行失败:" } });
    } catch (error) {
        console.error("注入脚本时出错:", error);
    }
}

async function destoryVueApp() {
    const webContents = getMainWebContents();
    if (!webContents) {
        return;
    }

    // await webContents.executeJavaScript(JSON.stringify(`
    //     (()=>{
    //         window.hierarchyApp.destroy();
    //         window.hierarchyApp = null;
    //     })();
    // `)).then((res) => {
    //     console.log("执行js", res);
    // });

    // await execJsInHierarchyApp(webContents, `
    //     window.hierarchyApp.destroy();
    //     window.hierarchyApp = null;
    // `);
}

interface IJSOption {
    jsonify?: boolean;
    message?: {
        success?: string;
        error?: string;
    };
}

async function execJs(webContents: WebContents | null, js: string, options?: IJSOption) {
    if (!webContents) {
        console.warn("执行失败: webContents 为空");
        return;
    }

    const defaultOptions: IJSOption = { jsonify: true, message: { success: "执行成功", error: "执行失败:" } };
    const mergedOptions: IJSOption = { ...defaultOptions, ...options };
    console.log(`执行js:\n${js}`);

    try {
        console.log("执行js, jsonify:", mergedOptions.jsonify);
        await webContents.executeJavaScript(mergedOptions.jsonify ? JSON.stringify(js) : js);
        console.log(mergedOptions.message?.success);
    } catch (error) {
        console.error(mergedOptions.message?.error, error);
    }
}

async function execJsImmediate(webContents: WebContents | null, js: string, options?: IJSOption) {
    await execJs(webContents, `
        (()=>{
            ${js}
        })();
    `, options);
}

async function execJsInHierarchyApp(webContents: WebContents | null, js: string, options?: IJSOption) {
    await execJsImmediate(webContents, `
        if(window.hierarchyApp){
            console.log("执行 hierarchyApp 相关")
            ${js}
        }
    `, options);

}

