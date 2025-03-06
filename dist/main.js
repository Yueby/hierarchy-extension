"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unload = exports.load = exports.methods = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_1 = require("electron");
// 应用状态管理
class HierarchyAppState {
    constructor() {
        this._isReady = false;
        this._readyPromise = new Promise((resolve) => {
            this._readyResolve = resolve;
        });
    }
    static getInstance() {
        if (!HierarchyAppState.instance) {
            HierarchyAppState.instance = new HierarchyAppState();
        }
        return HierarchyAppState.instance;
    }
    get isReady() {
        return this._isReady;
    }
    async waitUntilReady() {
        if (this._isReady)
            return;
        await this._readyPromise;
    }
    markAsReady() {
        this._isReady = true;
        this._readyResolve();
    }
    reset() {
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
exports.methods = {
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
    async onSceneReady(uuid) {
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
    async onSceneChangeNode(uuid) {
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
function load() {
    injectHierarchyApp();
}
exports.load = load;
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
async function unload() {
    await destoryVueApp();
    HierarchyAppState.getInstance().reset();
}
exports.unload = unload;
async function injectHierarchyApp() {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return null;
    }
    await injectScript(webContents);
    return webContents;
}
function getMainWebContents() {
    let allwins = electron_1.BrowserWindow.getAllWindows();
    for (let i = 0; i < allwins.length; i++) {
        const win = allwins[i];
        try {
            const url = win.webContents.getURL();
            const title = win.getTitle() || '';
            if (url.includes('windows/main.html') || title.includes('Cocos Creator')) {
                return win.webContents;
            }
        }
        catch (error) {
            console.error(`获取窗口 ${i} 信息时出错:`, error);
        }
    }
    console.warn("未找到Cocos Creator主窗口");
    return null;
}
function getScript() {
    const hackScriptPath = path_1.default.join(__dirname, 'hack.js');
    const script = fs_1.default.readFileSync(hackScriptPath, 'utf-8');
    return script;
}
async function injectScript(webContents) {
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return;
    }
    try {
        const script = getScript();
        await execJs(webContents, script, { jsonify: false, message: { success: "脚本注入成功", error: "脚本执行失败:" } });
    }
    catch (error) {
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
async function execJs(webContents, js, options) {
    var _a, _b;
    if (!webContents) {
        console.warn("执行失败: webContents 为空");
        return;
    }
    const defaultOptions = { jsonify: true, message: { success: "执行成功", error: "执行失败:" } };
    const mergedOptions = Object.assign(Object.assign({}, defaultOptions), options);
    console.log(`执行js:\n${js}`);
    try {
        console.log("执行js, jsonify:", mergedOptions.jsonify);
        await webContents.executeJavaScript(mergedOptions.jsonify ? JSON.stringify(js) : js);
        console.log((_a = mergedOptions.message) === null || _a === void 0 ? void 0 : _a.success);
    }
    catch (error) {
        console.error((_b = mergedOptions.message) === null || _b === void 0 ? void 0 : _b.error, error);
    }
}
async function execJsImmediate(webContents, js, options) {
    await execJs(webContents, `
        (()=>{
            ${js}
        })();
    `, options);
}
async function execJsInHierarchyApp(webContents, js, options) {
    await execJsImmediate(webContents, `
        if(window.hierarchyApp){
            console.log("执行 hierarchyApp 相关")
            ${js}
        }
    `, options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsdUNBQXNEO0FBRXRELFNBQVM7QUFDVCxNQUFNLGlCQUFpQjtJQU1uQjtRQUpRLGFBQVEsR0FBWSxLQUFLLENBQUM7UUFLOUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ3pDLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVELE1BQU0sQ0FBQyxXQUFXO1FBQ2QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRTtZQUM3QixpQkFBaUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1NBQ3hEO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7SUFDdEMsQ0FBQztJQUVELElBQUksT0FBTztRQUNQLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN6QixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWM7UUFDaEIsSUFBSSxJQUFJLENBQUMsUUFBUTtZQUFFLE9BQU87UUFDMUIsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzdCLENBQUM7SUFFRCxXQUFXO1FBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxLQUFLO1FBQ0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ3pDLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FB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S0FBSyxVQUFVLGVBQWUsQ0FBQyxXQUErQixFQUFFLEVBQVUsRUFBRSxPQUFtQjtJQUMzRixNQUFNLE1BQU0sQ0FBQyxXQUFXLEVBQUU7O2NBRWhCLEVBQUU7O0tBRVgsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNoQixDQUFDO0FBRUQsS0FBSyxVQUFVLG9CQUFvQixDQUFDLFdBQStCLEVBQUUsRUFBVSxFQUFFLE9BQW1CO0lBQ2hHLE1BQU0sZUFBZSxDQUFDLFdBQVcsRUFBRTs7O2NBR3pCLEVBQUU7O0tBRVgsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCB7IFdlYkNvbnRlbnRzLCBCcm93c2VyV2luZG93IH0gZnJvbSBcImVsZWN0cm9uXCI7XG5cbi8vIOW6lOeUqOeKtuaAgeeuoeeQhlxuY2xhc3MgSGllcmFyY2h5QXBwU3RhdGUge1xuICAgIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBIaWVyYXJjaHlBcHBTdGF0ZTtcbiAgICBwcml2YXRlIF9pc1JlYWR5OiBib29sZWFuID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBfcmVhZHlQcm9taXNlOiBQcm9taXNlPHZvaWQ+O1xuICAgIHByaXZhdGUgX3JlYWR5UmVzb2x2ZSE6ICgpID0+IHZvaWQ7XG5cbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9yZWFkeVByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcmVhZHlSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCk6IEhpZXJhcmNoeUFwcFN0YXRlIHtcbiAgICAgICAgaWYgKCFIaWVyYXJjaHlBcHBTdGF0ZS5pbnN0YW5jZSkge1xuICAgICAgICAgICAgSGllcmFyY2h5QXBwU3RhdGUuaW5zdGFuY2UgPSBuZXcgSGllcmFyY2h5QXBwU3RhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSGllcmFyY2h5QXBwU3RhdGUuaW5zdGFuY2U7XG4gICAgfVxuXG4gICAgZ2V0IGlzUmVhZHkoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc1JlYWR5O1xuICAgIH1cblxuICAgIGFzeW5jIHdhaXRVbnRpbFJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5faXNSZWFkeSkgcmV0dXJuO1xuICAgICAgICBhd2FpdCB0aGlzLl9yZWFkeVByb21pc2U7XG4gICAgfVxuXG4gICAgbWFya0FzUmVhZHkoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2lzUmVhZHkgPSB0cnVlO1xuICAgICAgICB0aGlzLl9yZWFkeVJlc29sdmUoKTtcbiAgICB9XG5cbiAgICByZXNldCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5faXNSZWFkeSA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9yZWFkeVByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcmVhZHlSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5sZXQgbWVzc2FnZVJlc3VsdCA9IHtcbiAgICBzY2VuZToge1xuICAgICAgICB1dWlkOiBcIlwiLFxuICAgICAgICBub2RlQ2hhbmdlOiB7XG4gICAgICAgICAgICB1dWlkOiBcIlwiXG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gUmVnaXN0cmF0aW9uIG1ldGhvZCBmb3IgdGhlIG1haW4gcHJvY2VzcyBvZiBFeHRlbnNpb25cbiAqIEB6aCDkuLrmianlsZXnmoTkuLvov5vnqIvnmoTms6jlhozmlrnms5VcbiAqL1xuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnk7IH0gPSB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBhY3RpdmUgc3RhdGUgb2YgdGhlIHNlbGVjdGVkIG5vZGVcbiAgICAgKiBAemgg6K6+572u6YCJ5Lit55qE6IqC54K555qE5r+A5rS754q25oCBXG4gICAgICovXG4gICAgYXN5bmMgc2V0Tm9kZUFjdGl2ZSgpIHtcbiAgICAgICAgY29uc3QgdXVpZHMgPSBFZGl0b3IuU2VsZWN0aW9uLmdldFNlbGVjdGVkKCdub2RlJyk7XG5cbiAgICAgICAgaWYgKHV1aWRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBub2RlVXVpZCBvZiB1dWlkcykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xuXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgcGF0aDogJ2FjdGl2ZScsXG4gICAgICAgICAgICAgICAgZHVtcDoge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnQm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAhbm9kZUluZm8uYWN0aXZlLnZhbHVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8g5re75Yqg5raI5oGv5aSE55CG5pa55rOVXG4gICAgJ2hpZXJhcmNoeS1hcHAtcmVhZHknKCkge1xuICAgICAgICBIaWVyYXJjaHlBcHBTdGF0ZS5nZXRJbnN0YW5jZSgpLm1hcmtBc1JlYWR5KCk7XG4gICAgfSxcblxuICAgIGFzeW5jIG9uU2NlbmVTaG93TG9hZGluZygpIHtcbiAgICAgICAgaWYgKCFIaWVyYXJjaHlBcHBTdGF0ZS5nZXRJbnN0YW5jZSgpLmlzUmVhZHkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwib25TY2VuZVNob3dMb2FkaW5nOiDlupTnlKjmnKrlsLHnu6pcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgZGVzdG9yeVZ1ZUFwcCgpO1xuICAgIH0sXG5cbiAgICBhc3luYyBvblNjZW5lUmVhZHkodXVpZDogc3RyaW5nKSB7XG4gICAgICAgIGlmICghSGllcmFyY2h5QXBwU3RhdGUuZ2V0SW5zdGFuY2UoKS5pc1JlYWR5KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm9uU2NlbmVSZWFkeTog5bqU55So5pyq5bCx57uqXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbWVzc2FnZVJlc3VsdC5zY2VuZS51dWlkID0gdXVpZDtcbiAgICAgICAgY29uc29sZS5sb2coXCJvblNjZW5lUmVhZHlcIiwgdXVpZCk7XG4gICAgICAgIGF3YWl0IGV4ZWNKc0luSGllcmFyY2h5QXBwKGdldE1haW5XZWJDb250ZW50cygpLCBgXG4gICAgICAgICAgICB3aW5kb3cuaGllcmFyY2h5QXBwLmhhbmRsZVNjZW5lUmVhZHkoXCIke3V1aWR9XCIpO1xuICAgICAgICBgKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgb25SZWZlcmVuY2VJbWFnZVNob3coKSB7XG4gICAgICAgIGNvbnN0IGFwcFN0YXRlID0gSGllcmFyY2h5QXBwU3RhdGUuZ2V0SW5zdGFuY2UoKTtcbiAgICAgICAgaWYgKCFhcHBTdGF0ZS5pc1JlYWR5KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm9uUmVmZXJlbmNlSW1hZ2VTaG93OiDms6jlhaXlupTnlKhcIik7XG4gICAgICAgICAgICBhd2FpdCBpbmplY3RIaWVyYXJjaHlBcHAoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwib25SZWZlcmVuY2VJbWFnZVNob3dcIiwgbWVzc2FnZVJlc3VsdC5zY2VuZS51dWlkKTtcbiAgICAgICAgYXdhaXQgZXhlY0pzSW5IaWVyYXJjaHlBcHAoZ2V0TWFpbldlYkNvbnRlbnRzKCksIGBcbiAgICAgICAgICAgIHdpbmRvdy5oaWVyYXJjaHlBcHAuaGFuZGxlUmVmZXJlbmNlSW1hZ2VTaG93KFwiJHttZXNzYWdlUmVzdWx0LnNjZW5lLnV1aWR9XCIpO1xuICAgICAgICBgKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgb25TY2VuZUNoYW5nZU5vZGUodXVpZDogc3RyaW5nKSB7XG4gICAgICAgIGlmICghSGllcmFyY2h5QXBwU3RhdGUuZ2V0SW5zdGFuY2UoKS5pc1JlYWR5KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm9uU2NlbmVDaGFuZ2VOb2RlOiDlupTnlKjmnKrlsLHnu6pcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBtZXNzYWdlUmVzdWx0LnNjZW5lLm5vZGVDaGFuZ2UudXVpZCA9IHV1aWQ7XG4gICAgICAgIGNvbnNvbGUubG9nKFwib25TY2VuZUNoYW5nZU5vZGVcIiwgdXVpZCk7XG4gICAgICAgIGF3YWl0IGV4ZWNKc0luSGllcmFyY2h5QXBwKGdldE1haW5XZWJDb250ZW50cygpLCBgXG4gICAgICAgICAgICB3aW5kb3cuaGllcmFyY2h5QXBwLmhhbmRsZVNjZW5lQ2hhbmdlTm9kZShcIiR7dXVpZH1cIik7XG4gICAgICAgIGApO1xuICAgIH0sXG5cbn07XG5cbi8qKlxuICogQGVuIE1ldGhvZCBUcmlnZ2VyZWQgb24gRXh0ZW5zaW9uIFN0YXJ0dXBcbiAqIEB6aCDmianlsZXlkK/liqjml7bop6blj5HnmoTmlrnms5VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvYWQoKSB7XG4gICAgaW5qZWN0SGllcmFyY2h5QXBwKCk7XG59XG5cbi8qKlxuICogQGVuIE1ldGhvZCB0cmlnZ2VyZWQgd2hlbiB1bmluc3RhbGxpbmcgdGhlIGV4dGVuc2lvblxuICogQHpoIOWNuOi9veaJqeWxleaXtuinpuWPkeeahOaWueazlVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdW5sb2FkKCkge1xuICAgIGF3YWl0IGRlc3RvcnlWdWVBcHAoKTtcbiAgICBIaWVyYXJjaHlBcHBTdGF0ZS5nZXRJbnN0YW5jZSgpLnJlc2V0KCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluamVjdEhpZXJhcmNoeUFwcCgpOiBQcm9taXNlPFdlYkNvbnRlbnRzIHwgbnVsbD4ge1xuICAgIGNvbnN0IHdlYkNvbnRlbnRzID0gZ2V0TWFpbldlYkNvbnRlbnRzKCk7XG4gICAgaWYgKCF3ZWJDb250ZW50cykge1xuICAgICAgICBjb25zb2xlLndhcm4oXCLms6jlhaXlpLHotKU6IHdlYkNvbnRlbnRzIOS4uuepulwiKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgYXdhaXQgaW5qZWN0U2NyaXB0KHdlYkNvbnRlbnRzKTtcbiAgICByZXR1cm4gd2ViQ29udGVudHM7XG59XG5cbmZ1bmN0aW9uIGdldE1haW5XZWJDb250ZW50cygpOiBXZWJDb250ZW50cyB8IG51bGwge1xuICAgIGxldCBhbGx3aW5zID0gQnJvd3NlcldpbmRvdy5nZXRBbGxXaW5kb3dzKCk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFsbHdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3Qgd2luID0gYWxsd2luc1tpXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHdpbi53ZWJDb250ZW50cy5nZXRVUkwoKTtcbiAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gd2luLmdldFRpdGxlKCkgfHwgJyc7XG5cbiAgICAgICAgICAgIGlmICh1cmwuaW5jbHVkZXMoJ3dpbmRvd3MvbWFpbi5odG1sJykgfHwgdGl0bGUuaW5jbHVkZXMoJ0NvY29zIENyZWF0b3InKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3aW4ud2ViQ29udGVudHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGDojrflj5bnqpflj6MgJHtpfSDkv6Hmga/ml7blh7rplJk6YCwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNvbnNvbGUud2FybihcIuacquaJvuWIsENvY29zIENyZWF0b3LkuLvnqpflj6NcIik7XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldFNjcmlwdCgpIHtcbiAgICBjb25zdCBoYWNrU2NyaXB0UGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdoYWNrLmpzJyk7XG4gICAgY29uc3Qgc2NyaXB0ID0gZnMucmVhZEZpbGVTeW5jKGhhY2tTY3JpcHRQYXRoLCAndXRmLTgnKTtcbiAgICByZXR1cm4gc2NyaXB0O1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbmplY3RTY3JpcHQod2ViQ29udGVudHM6IFdlYkNvbnRlbnRzIHwgbnVsbCkge1xuICAgIGlmICghd2ViQ29udGVudHMpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwi5rOo5YWl5aSx6LSlOiB3ZWJDb250ZW50cyDkuLrnqbpcIik7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBjb25zdCBzY3JpcHQgPSBnZXRTY3JpcHQoKTtcbiAgICAgICAgYXdhaXQgZXhlY0pzKHdlYkNvbnRlbnRzLCBzY3JpcHQsIHsganNvbmlmeTogZmFsc2UsIG1lc3NhZ2U6IHsgc3VjY2VzczogXCLohJrmnKzms6jlhaXmiJDlip9cIiwgZXJyb3I6IFwi6ISa5pys5omn6KGM5aSx6LSlOlwiIH0gfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIuazqOWFpeiEmuacrOaXtuWHuumUmTpcIiwgZXJyb3IpO1xuICAgIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZGVzdG9yeVZ1ZUFwcCgpIHtcbiAgICBjb25zdCB3ZWJDb250ZW50cyA9IGdldE1haW5XZWJDb250ZW50cygpO1xuICAgIGlmICghd2ViQ29udGVudHMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGF3YWl0IHdlYkNvbnRlbnRzLmV4ZWN1dGVKYXZhU2NyaXB0KEpTT04uc3RyaW5naWZ5KGBcbiAgICAvLyAgICAgKCgpPT57XG4gICAgLy8gICAgICAgICB3aW5kb3cuaGllcmFyY2h5QXBwLmRlc3Ryb3koKTtcbiAgICAvLyAgICAgICAgIHdpbmRvdy5oaWVyYXJjaHlBcHAgPSBudWxsO1xuICAgIC8vICAgICB9KSgpO1xuICAgIC8vIGApKS50aGVuKChyZXMpID0+IHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coXCLmiafooYxqc1wiLCByZXMpO1xuICAgIC8vIH0pO1xuXG4gICAgLy8gYXdhaXQgZXhlY0pzSW5IaWVyYXJjaHlBcHAod2ViQ29udGVudHMsIGBcbiAgICAvLyAgICAgd2luZG93LmhpZXJhcmNoeUFwcC5kZXN0cm95KCk7XG4gICAgLy8gICAgIHdpbmRvdy5oaWVyYXJjaHlBcHAgPSBudWxsO1xuICAgIC8vIGApO1xufVxuXG5pbnRlcmZhY2UgSUpTT3B0aW9uIHtcbiAgICBqc29uaWZ5PzogYm9vbGVhbjtcbiAgICBtZXNzYWdlPzoge1xuICAgICAgICBzdWNjZXNzPzogc3RyaW5nO1xuICAgICAgICBlcnJvcj86IHN0cmluZztcbiAgICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBleGVjSnMod2ViQ29udGVudHM6IFdlYkNvbnRlbnRzIHwgbnVsbCwganM6IHN0cmluZywgb3B0aW9ucz86IElKU09wdGlvbikge1xuICAgIGlmICghd2ViQ29udGVudHMpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwi5omn6KGM5aSx6LSlOiB3ZWJDb250ZW50cyDkuLrnqbpcIik7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWZhdWx0T3B0aW9uczogSUpTT3B0aW9uID0geyBqc29uaWZ5OiB0cnVlLCBtZXNzYWdlOiB7IHN1Y2Nlc3M6IFwi5omn6KGM5oiQ5YqfXCIsIGVycm9yOiBcIuaJp+ihjOWksei0pTpcIiB9IH07XG4gICAgY29uc3QgbWVyZ2VkT3B0aW9uczogSUpTT3B0aW9uID0geyAuLi5kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9O1xuICAgIGNvbnNvbGUubG9nKGDmiafooYxqczpcXG4ke2pzfWApO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgY29uc29sZS5sb2coXCLmiafooYxqcywganNvbmlmeTpcIiwgbWVyZ2VkT3B0aW9ucy5qc29uaWZ5KTtcbiAgICAgICAgYXdhaXQgd2ViQ29udGVudHMuZXhlY3V0ZUphdmFTY3JpcHQobWVyZ2VkT3B0aW9ucy5qc29uaWZ5ID8gSlNPTi5zdHJpbmdpZnkoanMpIDoganMpO1xuICAgICAgICBjb25zb2xlLmxvZyhtZXJnZWRPcHRpb25zLm1lc3NhZ2U/LnN1Y2Nlc3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobWVyZ2VkT3B0aW9ucy5tZXNzYWdlPy5lcnJvciwgZXJyb3IpO1xuICAgIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZXhlY0pzSW1tZWRpYXRlKHdlYkNvbnRlbnRzOiBXZWJDb250ZW50cyB8IG51bGwsIGpzOiBzdHJpbmcsIG9wdGlvbnM/OiBJSlNPcHRpb24pIHtcbiAgICBhd2FpdCBleGVjSnMod2ViQ29udGVudHMsIGBcbiAgICAgICAgKCgpPT57XG4gICAgICAgICAgICAke2pzfVxuICAgICAgICB9KSgpO1xuICAgIGAsIG9wdGlvbnMpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBleGVjSnNJbkhpZXJhcmNoeUFwcCh3ZWJDb250ZW50czogV2ViQ29udGVudHMgfCBudWxsLCBqczogc3RyaW5nLCBvcHRpb25zPzogSUpTT3B0aW9uKSB7XG4gICAgYXdhaXQgZXhlY0pzSW1tZWRpYXRlKHdlYkNvbnRlbnRzLCBgXG4gICAgICAgIGlmKHdpbmRvdy5oaWVyYXJjaHlBcHApe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCLmiafooYwgaGllcmFyY2h5QXBwIOebuOWFs1wiKVxuICAgICAgICAgICAgJHtqc31cbiAgICAgICAgfVxuICAgIGAsIG9wdGlvbnMpO1xuXG59XG5cbiJdfQ==