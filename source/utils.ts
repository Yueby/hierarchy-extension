import { Utils } from "./types";

(function () {
    // 初始化全局utils对象
    const utils: Utils = {
        debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
            let timer: number | null = null;

            return function (this: any, ...args: Parameters<T>): void {
                if (timer) {
                    clearTimeout(timer);
                }

                timer = window.setTimeout(() => {
                    fn.apply(this, args);
                    timer = null;
                }, delay);
            };
        },

        throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void {
            let lastCall = 0;

            return function (this: any, ...args: Parameters<T>): void {
                const now = Date.now();

                if (now - lastCall >= limit) {
                    fn.apply(this, args);
                    lastCall = now;
                }
            };
        },

        safeQuerySelector<T extends Element>(selector: string, parent: Element | Document = document): T | null {
            try {
                return parent.querySelector<T>(selector);
            } catch (error) {
                console.error('[hierarchy-utils]', '选择器错误:', selector, error);
                return null;
            }
        },

        appendChildren(parent: Element, children: Element[]): void {
            const fragment = document.createDocumentFragment();
            children.forEach(child => fragment.appendChild(child));
            parent.appendChild(fragment);
        },

        waitForCondition(
            condition: () => boolean,
            timeout: number = 10000,
            interval: number = 100
        ): Promise<void> {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();

                const check = () => {
                    if (condition()) {
                        resolve();
                        return;
                    }

                    if (Date.now() - startTime >= timeout) {
                        reject(new Error('等待条件超时'));
                        return;
                    }

                    setTimeout(check, interval);
                };

                check();
            });
        },

        async exponentialRetry<T>(
            fn: () => Promise<T>,
            maxRetries: number = 5,
            initialDelay: number = 100
        ): Promise<T> {
            let retries = 0;

            while (true) {
                try {
                    return await fn();
                } catch (error) {
                    if (retries >= maxRetries) {
                        throw error;
                    }

                    const delay = initialDelay * Math.pow(2, retries);
                    console.warn('[hierarchy-utils]', `重试 ${retries + 1}/${maxRetries}，延迟 ${delay}ms`);

                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                }
            }
        }
    };
    window.utils = utils;
})(); 