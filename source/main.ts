import fs from "fs";
import { WebContents, BrowserWindow } from "electron";
import path from "path";

// 跟踪注入状态
let injected = false;

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
    },

    /**
     * @en Called when scene is ready
     * @zh 场景准备好时调用
     */
    async onSceneReady() {
        // console.info('[hierarchy-extension]', '场景准备就绪');
        
        const webContents = getMainWebContents();
        if (!webContents) {
            console.error("[hierarchy-extension]", "无法获取webContents");
            return;
        }

        try {
            // 检查hierarchy是否已初始化
            const hierarchyStatus = await webContents.executeJavaScript(`
                (async () => {
                    if (window.hierarchy) {
                        return { initialized: true };
                    } else {
                        return { initialized: false };
                    }
                })()
            `);

            if (!hierarchyStatus.initialized) {
                // 重置注入状态，强制重新注入
                injected = false;
                inject();
            } else {
                // 如果已初始化，更新injected状态
                injected = true;
            }
        } catch (error) {
            console.error('[hierarchy-extension]', '检查层级管理器状态失败:', error);
            // 如果检查失败，尝试重新注入
            injected = false;
            inject();
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
        console.error("[hierarchy-extension]", "清理失败: webContents 为空");
        return;
    }

    // 执行清理脚本
    webContents.executeJavaScript(`
        if (window.hierarchy) {
            window.hierarchy.cleanup();
        }
    `).catch(error => console.error('[hierarchy-extension]', '清理失败:', error));
    
    // 重置注入状态
    injected = false;
}

function inject(): void {
    // 如果已经注入过，则先检查是否真的存在
    if (injected) {
        const webContents = getMainWebContents();
        if (!webContents) {
            console.error("[hierarchy-extension]", "注入失败: webContents 为空");
            return;
        }

        // 验证hierarchy是否真的存在
        webContents.executeJavaScript(`window.hierarchy !== undefined`)
            .then(exists => {
                if (!exists) {
                    injected = false;
                    performInjection();
                }
            })
            .catch(() => {
                console.error('[hierarchy-extension]', '验证层级管理器状态失败，重新注入');
                injected = false;
                performInjection();
            });
        return;
    }

    performInjection();
}

// 实际执行注入的函数
function performInjection(): void {
    const webContents = getMainWebContents();
    if (!webContents) {
        console.error("[hierarchy-extension]", "注入失败: webContents 为空");
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
            // 检查是否已经初始化
            if (window.hierarchy) {
                return true;
            }
            
            ${utils}
            ${hierarchyInit}
            
            // 等待层级管理器初始化完成
            const ready = await window.hierarchyReady;
            if (!ready) {
                console.error('[hierarchy-extension]', '层级管理器初始化失败，扩展加载取消');
                return false;
            }
 
            ${nodeActivator}
            ${headerNode}
            return true;
        } catch (error) {
            console.error('[hierarchy-extension]', '注入失败:', error);
            return false;
        }
    })()`;

    webContents.executeJavaScript(injectScript)
        .then(result => {
            injected = result;
            if (result) {
                // console.info('[hierarchy-extension]', '注入成功');
            } else {
                console.warn('[hierarchy-extension]', '注入未成功');
            }
        })
        .catch(error => {
            console.error('[hierarchy-extension]', '注入失败:', error);
            injected = false;
        });
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
            console.error('[hierarchy-extension]', '获取窗口信息时出错:', error);
        }
    }
    console.error("[hierarchy-extension]", "未找到Cocos Creator主窗口");
    return null;
}

