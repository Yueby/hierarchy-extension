import { nodeTree } from "./node-tree";

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export function load() {
    nodeTree.init();
}

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export async function unload() {
} 