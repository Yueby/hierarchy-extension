"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unload = exports.load = exports.methods = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_1 = require("electron");
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
    async onSceneReady() {
        injectHierarchyApp();
    },
    async onSceneChangeNode(uuid) {
        let webContents = getMainWebContents();
        if (!webContents) {
            return;
        }
        console.log("onSceneChangeNode", uuid);
        webContents.executeJavaScript(JSON.stringify(`
            (()=>{
                if(window.hierarchyApp){
                    window.hierarchyApp.handleSceneChangeNode(${uuid});
                }
            })();
            `));
    }
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
function unload() {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return;
    }
    try {
        webContents.executeJavaScript(JSON.stringify(`
            (()=>{
                if(window.hierarchyApp){
                    window.hierarchyApp.destroy();
                }
            })();
            `));
    }
    catch (error) {
        console.error("执行脚本时出错:", error);
    }
}
exports.unload = unload;
function injectHierarchyApp() {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.warn("注入失败: webContents 为空");
        return;
    }
    injectScript(webContents);
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
function injectScript(webContents) {
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
    }
    catch (error) {
        console.error("注入脚本时出错:", error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsdUNBQXNEO0FBRXREOzs7R0FHRztBQUNVLFFBQUEsT0FBTyxHQUE2QztJQUM3RDs7O09BR0c7SUFDSCxLQUFLLENBQUMsYUFBYTtRQUNmLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRW5ELElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDbkIsT0FBTztTQUNWO1FBRUQsS0FBSyxJQUFJLFFBQVEsSUFBSSxLQUFLLEVBQUU7WUFDeEIsTUFBTSxRQUFRLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRS9FLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRTtnQkFDbEQsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFO29CQUNGLElBQUksRUFBRSxTQUFTO29CQUNmLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSztpQkFDaEM7YUFDSixDQUFDLENBQUM7U0FDTjtJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWTtRQUNkLGtCQUFrQixFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFZO1FBQ2hDLElBQUksV0FBVyxHQUFHLGtCQUFrQixFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNkLE9BQU87U0FDVjtRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUM7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QUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztLQUNOO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDWixPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUNwQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgV2ViQ29udGVudHMsIEJyb3dzZXJXaW5kb3cgfSBmcm9tIFwiZWxlY3Ryb25cIjtcblxuLyoqXG4gKiBAZW4gUmVnaXN0cmF0aW9uIG1ldGhvZCBmb3IgdGhlIG1haW4gcHJvY2VzcyBvZiBFeHRlbnNpb25cbiAqIEB6aCDkuLrmianlsZXnmoTkuLvov5vnqIvnmoTms6jlhozmlrnms5VcbiAqL1xuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnk7IH0gPSB7XG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgYWN0aXZlIHN0YXRlIG9mIHRoZSBzZWxlY3RlZCBub2RlXG4gICAgICogQHpoIOiuvue9rumAieS4reeahOiKgueCueeahOa/gOa0u+eKtuaAgVxuICAgICAqL1xuICAgIGFzeW5jIHNldE5vZGVBY3RpdmUoKSB7XG4gICAgICAgIGNvbnN0IHV1aWRzID0gRWRpdG9yLlNlbGVjdGlvbi5nZXRTZWxlY3RlZCgnbm9kZScpO1xuXG4gICAgICAgIGlmICh1dWlkcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgbm9kZVV1aWQgb2YgdXVpZHMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcblxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgIHBhdGg6ICdhY3RpdmUnLFxuICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ0Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogIW5vZGVJbmZvLmFjdGl2ZS52YWx1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFzeW5jIG9uU2NlbmVSZWFkeSgpIHtcbiAgICAgICAgaW5qZWN0SGllcmFyY2h5QXBwKCk7XG4gICAgfSxcblxuICAgIGFzeW5jIG9uU2NlbmVDaGFuZ2VOb2RlKHV1aWQ6IHN0cmluZykge1xuICAgICAgICBsZXQgd2ViQ29udGVudHMgPSBnZXRNYWluV2ViQ29udGVudHMoKTtcbiAgICAgICAgaWYgKCF3ZWJDb250ZW50cykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJvblNjZW5lQ2hhbmdlTm9kZVwiLCB1dWlkKTtcbiAgICAgICAgd2ViQ29udGVudHMuZXhlY3V0ZUphdmFTY3JpcHQoSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgICBgXG4gICAgICAgICAgICAoKCk9PntcbiAgICAgICAgICAgICAgICBpZih3aW5kb3cuaGllcmFyY2h5QXBwKXtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmhpZXJhcmNoeUFwcC5oYW5kbGVTY2VuZUNoYW5nZU5vZGUoJHt1dWlkfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgIGBcbiAgICAgICAgKSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBAZW4gTWV0aG9kIFRyaWdnZXJlZCBvbiBFeHRlbnNpb24gU3RhcnR1cFxuICogQHpoIOaJqeWxleWQr+WKqOaXtuinpuWPkeeahOaWueazlVxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9hZCgpIHtcbiAgICBpbmplY3RIaWVyYXJjaHlBcHAoKTtcbn1cblxuLyoqXG4gKiBAZW4gTWV0aG9kIHRyaWdnZXJlZCB3aGVuIHVuaW5zdGFsbGluZyB0aGUgZXh0ZW5zaW9uXG4gKiBAemgg5Y246L295omp5bGV5pe26Kem5Y+R55qE5pa55rOVXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmxvYWQoKSB7XG4gICAgY29uc3Qgd2ViQ29udGVudHMgPSBnZXRNYWluV2ViQ29udGVudHMoKTtcbiAgICBpZiAoIXdlYkNvbnRlbnRzKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIuazqOWFpeWksei0pTogd2ViQ29udGVudHMg5Li656m6XCIpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgd2ViQ29udGVudHMuZXhlY3V0ZUphdmFTY3JpcHQoSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgICBgXG4gICAgICAgICAgICAoKCk9PntcbiAgICAgICAgICAgICAgICBpZih3aW5kb3cuaGllcmFyY2h5QXBwKXtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmhpZXJhcmNoeUFwcC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgIGBcbiAgICAgICAgKSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIuaJp+ihjOiEmuacrOaXtuWHuumUmTpcIiwgZXJyb3IpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaW5qZWN0SGllcmFyY2h5QXBwKCkge1xuICAgIGNvbnN0IHdlYkNvbnRlbnRzID0gZ2V0TWFpbldlYkNvbnRlbnRzKCk7XG4gICAgaWYgKCF3ZWJDb250ZW50cykge1xuICAgICAgICBjb25zb2xlLndhcm4oXCLms6jlhaXlpLHotKU6IHdlYkNvbnRlbnRzIOS4uuepulwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpbmplY3RTY3JpcHQod2ViQ29udGVudHMpO1xufVxuXG5mdW5jdGlvbiBnZXRNYWluV2ViQ29udGVudHMoKTogV2ViQ29udGVudHMgfCBudWxsIHtcbiAgICBsZXQgYWxsd2lucyA9IEJyb3dzZXJXaW5kb3cuZ2V0QWxsV2luZG93cygpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhbGx3aW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHdpbiA9IGFsbHdpbnNbaV07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB1cmwgPSB3aW4ud2ViQ29udGVudHMuZ2V0VVJMKCk7XG4gICAgICAgICAgICBjb25zdCB0aXRsZSA9IHdpbi5nZXRUaXRsZSgpIHx8ICcnO1xuXG4gICAgICAgICAgICBpZiAodXJsLmluY2x1ZGVzKCd3aW5kb3dzL21haW4uaHRtbCcpIHx8IHRpdGxlLmluY2x1ZGVzKCdDb2NvcyBDcmVhdG9yJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd2luLndlYkNvbnRlbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihg6I635Y+W56qX5Y+jICR7aX0g5L+h5oGv5pe25Ye66ZSZOmAsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLndhcm4oXCLmnKrmib7liLBDb2NvcyBDcmVhdG9y5Li756qX5Y+jXCIpO1xuICAgIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXRTY3JpcHQoKSB7XG4gICAgY29uc3QgaGFja1NjcmlwdFBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnaGFjay5qcycpO1xuICAgIGNvbnN0IHNjcmlwdCA9IGZzLnJlYWRGaWxlU3luYyhoYWNrU2NyaXB0UGF0aCwgJ3V0Zi04Jyk7XG4gICAgcmV0dXJuIHNjcmlwdDtcbn1cblxuZnVuY3Rpb24gaW5qZWN0U2NyaXB0KHdlYkNvbnRlbnRzOiBXZWJDb250ZW50cyB8IG51bGwpIHtcbiAgICBpZiAoIXdlYkNvbnRlbnRzKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIuazqOWFpeWksei0pTogd2ViQ29udGVudHMg5Li656m6XCIpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc2NyaXB0ID0gZ2V0U2NyaXB0KCk7XG4gICAgICAgIHdlYkNvbnRlbnRzLmV4ZWN1dGVKYXZhU2NyaXB0KHNjcmlwdCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIuiEmuacrOazqOWFpeaIkOWKn1wiKTtcbiAgICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwi6ISa5pys5omn6KGM5aSx6LSlOlwiLCBlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCLms6jlhaXohJrmnKzml7blh7rplJk6XCIsIGVycm9yKTtcbiAgICB9XG59XG5cblxuXG4iXX0=