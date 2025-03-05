"use strict";
// 该脚本只能使用require，不可以impoort
(() => {
    try {
        const fs = require('fs');
        const path = require('path');
        const Vue = require('vue');
        // 获取 dock 的 shadowRoot
        function getDockShadowRoot() {
            const dockFrame = document.querySelector('#dock');
            if (!dockFrame) {
                console.error('未找到 #dock');
                return null;
            }
            const shadowRoot = dockFrame.shadowRoot;
            if (!shadowRoot) {
                console.error('未找到 shadowRoot');
                return null;
            }
            return shadowRoot;
        }
        // 获取层级面板
        function getHierarchyPanel() {
            const shadowRoot = getDockShadowRoot();
            if (!shadowRoot)
                return null;
            const dockLayouts = shadowRoot.querySelectorAll('dock-layout > dock-layout');
            for (let i = 0; i < dockLayouts.length; i++) {
                const layout = dockLayouts[i];
                const panel = layout.querySelector('dock-groups > dock-panels > panel-frame[name="hierarchy"]');
                if (panel)
                    return panel;
            }
            return null;
        }
        // 创建 Vue 应用
        function createHierarchyApp(panel) {
            // 创建容器元素
            const container = document.createElement('div');
            container.id = 'hierarchy-extension';
            container.style.cssText = 'position: absolute; top: 0; right: 0; z-index: 999;';
            panel.appendChild(container);
            // 创建 Vue 应用
            const app = new Vue({
                data() {
                    return {
                        message: 'Hello Hierarchy!',
                        buttons: [
                            { id: 'btn1', label: '按钮1' },
                            { id: 'btn2', label: '按钮2' }
                        ]
                    };
                },
                template: `
                    <div class="hierarchy-extension-container">
                        <div class="button-group">
                            <button 
                                v-for="btn in buttons" 
                                :key="btn.id"
                                @click="handleClick(btn.id)"
                                class="hierarchy-btn"
                            >
                                {{ btn.label }}
                            </button>
                        </div>
                    </div>
                `,
                methods: {
                    handleClick(btnId) {
                        console.log('按钮点击:', btnId);
                    },
                    handleSceneChangeNode(uuid) {
                        console.log('节点变化:', uuid);
                    }
                },
                mounted() {
                    console.log('Vue 应用挂载成功');
                    window.hierarchyApp = this;
                }
            });
            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .hierarchy-extension-container {
                    padding: 4px;
                    background: var(--color-normal-fill);
                }
                .button-group {
                    display: flex;
                    gap: 4px;
                }
                .hierarchy-btn {
                    padding: 2px 8px;
                    border: 1px solid var(--color-normal-border);
                    background: var(--color-normal-fill);
                    color: var(--color-normal-contrast);
                    border-radius: 2px;
                    cursor: pointer;
                }
                .hierarchy-btn:hover {
                    background: var(--color-hover-fill);
                }
            `;
            container.appendChild(style);
            // 挂载应用
            app.$mount(container);
            return app;
        }
        // 主逻辑
        const hierarchyPanel = getHierarchyPanel();
        if (hierarchyPanel) {
            // 创建并挂载 Vue 应用
            const app = createHierarchyApp(hierarchyPanel);
            // 保存到全局变量
            window.hierarchyApp = app;
            console.log('Vue 应用创建成功', app);
        }
        else {
            console.error('未找到 hierarchy panel');
        }
    }
    catch (error) {
        console.error('操作失败:', error);
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9oYWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw0QkFBNEI7QUFDNUIsQ0FBQyxHQUFHLEVBQUU7SUFDRixJQUFJO1FBQ0EsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFM0IsdUJBQXVCO1FBQ3ZCLFNBQVMsaUJBQWlCO1lBQ3RCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDWixPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUMzQixPQUFPLElBQUksQ0FBQzthQUNmO1lBRUQsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQztZQUN4QyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDaEMsT0FBTyxJQUFJLENBQUM7YUFDZjtZQUVELE9BQU8sVUFBVSxDQUFDO1FBQ3RCLENBQUM7UUFFRCxTQUFTO1FBQ1QsU0FBUyxpQkFBaUI7WUFDdEIsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsVUFBVTtnQkFBRSxPQUFPLElBQUksQ0FBQztZQUU3QixNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUM3RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLDJEQUEyRCxDQUFDLENBQUM7Z0JBQ2hHLElBQUksS0FBSztvQkFBRSxPQUFPLEtBQUssQ0FBQzthQUMzQjtZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxZQUFZO1FBQ1osU0FBUyxrQkFBa0IsQ0FBQyxLQUFjO1lBQ3RDLFNBQVM7WUFDVCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hELFNBQVMsQ0FBQyxFQUFFLEdBQUcscUJBQXFCLENBQUM7WUFDckMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcscURBQXFELENBQUM7WUFDaEYsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUU3QixZQUFZO1lBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUM7Z0JBQ2hCLElBQUk7b0JBQ0EsT0FBTzt3QkFDSCxPQUFPLEVBQUUsa0JBQWtCO3dCQUMzQixPQUFPLEVBQUU7NEJBQ0wsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7NEJBQzVCLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO3lCQUMvQjtxQkFDSixDQUFDO2dCQUNOLENBQUM7Z0JBQ0QsUUFBUSxFQUFFOzs7Ozs7Ozs7Ozs7O2lCQWFUO2dCQUNELE9BQU8sRUFBRTtvQkFDTCxXQUFXLENBQUMsS0FBYTt3QkFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2hDLENBQUM7b0JBQ0QscUJBQXFCLENBQUMsSUFBWTt3QkFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQy9CLENBQUM7aUJBQ0o7Z0JBQ0QsT0FBTztvQkFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUMxQixNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztnQkFDL0IsQ0FBQzthQUNKLENBQUMsQ0FBQztZQUVILE9BQU87WUFDUCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzlDLEtBQUssQ0FBQyxXQUFXLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2FBb0JuQixDQUFDO1lBQ0YsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUU3QixPQUFPO1lBQ1AsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV0QixPQUFPLEdBQUcsQ0FBQztRQUNmLENBQUM7UUFFRCxNQUFNO1FBQ04sTUFBTSxjQUFjLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztRQUMzQyxJQUFJLGNBQWMsRUFBRTtZQUNoQixlQUFlO1lBQ2YsTUFBTSxHQUFHLEdBQUcsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDL0MsVUFBVTtZQUVWLE1BQU0sQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDO1lBRTFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBRWxDO2FBQU07WUFDSCxPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7U0FDeEM7S0FFSjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDakM7QUFFTCxDQUFDLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8g6K+l6ISa5pys5Y+q6IO95L2/55SocmVxdWlyZe+8jOS4jeWPr+S7pWltcG9vcnRcclxuKCgpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xyXG4gICAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XHJcbiAgICAgICAgY29uc3QgVnVlID0gcmVxdWlyZSgndnVlJyk7XHJcblxyXG4gICAgICAgIC8vIOiOt+WPliBkb2NrIOeahCBzaGFkb3dSb290XHJcbiAgICAgICAgZnVuY3Rpb24gZ2V0RG9ja1NoYWRvd1Jvb3QoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRvY2tGcmFtZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkb2NrJyk7XHJcbiAgICAgICAgICAgIGlmICghZG9ja0ZyYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmnKrmib7liLAgI2RvY2snKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBzaGFkb3dSb290ID0gZG9ja0ZyYW1lLnNoYWRvd1Jvb3Q7XHJcbiAgICAgICAgICAgIGlmICghc2hhZG93Um9vdCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5pyq5om+5YiwIHNoYWRvd1Jvb3QnKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gc2hhZG93Um9vdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIOiOt+WPluWxgue6p+mdouadv1xyXG4gICAgICAgIGZ1bmN0aW9uIGdldEhpZXJhcmNoeVBhbmVsKCkge1xyXG4gICAgICAgICAgICBjb25zdCBzaGFkb3dSb290ID0gZ2V0RG9ja1NoYWRvd1Jvb3QoKTtcclxuICAgICAgICAgICAgaWYgKCFzaGFkb3dSb290KSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGRvY2tMYXlvdXRzID0gc2hhZG93Um9vdC5xdWVyeVNlbGVjdG9yQWxsKCdkb2NrLWxheW91dCA+IGRvY2stbGF5b3V0Jyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZG9ja0xheW91dHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxheW91dCA9IGRvY2tMYXlvdXRzW2ldO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcGFuZWwgPSBsYXlvdXQucXVlcnlTZWxlY3RvcignZG9jay1ncm91cHMgPiBkb2NrLXBhbmVscyA+IHBhbmVsLWZyYW1lW25hbWU9XCJoaWVyYXJjaHlcIl0nKTtcclxuICAgICAgICAgICAgICAgIGlmIChwYW5lbCkgcmV0dXJuIHBhbmVsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8g5Yib5bu6IFZ1ZSDlupTnlKhcclxuICAgICAgICBmdW5jdGlvbiBjcmVhdGVIaWVyYXJjaHlBcHAocGFuZWw6IEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgLy8g5Yib5bu65a655Zmo5YWD57SgXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICBjb250YWluZXIuaWQgPSAnaGllcmFyY2h5LWV4dGVuc2lvbic7XHJcbiAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5jc3NUZXh0ID0gJ3Bvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAwOyByaWdodDogMDsgei1pbmRleDogOTk5Oyc7XHJcbiAgICAgICAgICAgIHBhbmVsLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XHJcblxyXG4gICAgICAgICAgICAvLyDliJvlu7ogVnVlIOW6lOeUqFxyXG4gICAgICAgICAgICBjb25zdCBhcHAgPSBuZXcgVnVlKHtcclxuICAgICAgICAgICAgICAgIGRhdGEoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0hlbGxvIEhpZXJhcmNoeSEnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGlkOiAnYnRuMScsIGxhYmVsOiAn5oyJ6ZKuMScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdidG4yJywgbGFiZWw6ICfmjInpkq4yJyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBgXHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhpZXJhcmNoeS1leHRlbnNpb24tY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJidXR0b24tZ3JvdXBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdi1mb3I9XCJidG4gaW4gYnV0dG9uc1wiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDprZXk9XCJidG4uaWRcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBjbGljaz1cImhhbmRsZUNsaWNrKGJ0bi5pZClcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiaGllcmFyY2h5LWJ0blwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3sgYnRuLmxhYmVsIH19XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICBgLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZUNsaWNrKGJ0bklkOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+aMiemSrueCueWHuzonLCBidG5JZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY2VuZUNoYW5nZU5vZGUodXVpZDogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfoioLngrnlj5jljJY6JywgdXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG1vdW50ZWQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1Z1ZSDlupTnlKjmjILovb3miJDlip8nKTtcclxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuaGllcmFyY2h5QXBwID0gdGhpcztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyDmt7vliqDmoLflvI9cclxuICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IGBcclxuICAgICAgICAgICAgICAgIC5oaWVyYXJjaHktZXh0ZW5zaW9uLWNvbnRhaW5lciB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogNHB4O1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWNvbG9yLW5vcm1hbC1maWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC5idXR0b24tZ3JvdXAge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgZ2FwOiA0cHg7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAuaGllcmFyY2h5LWJ0biB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogMnB4IDhweDtcclxuICAgICAgICAgICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1jb2xvci1ub3JtYWwtYm9yZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1jb2xvci1ub3JtYWwtZmlsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLWNvbG9yLW5vcm1hbC1jb250cmFzdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogMnB4O1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC5oaWVyYXJjaHktYnRuOmhvdmVyIHtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1jb2xvci1ob3Zlci1maWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYDtcclxuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHN0eWxlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIOaMgui9veW6lOeUqFxyXG4gICAgICAgICAgICBhcHAuJG1vdW50KGNvbnRhaW5lcik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYXBwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8g5Li76YC76L6RXHJcbiAgICAgICAgY29uc3QgaGllcmFyY2h5UGFuZWwgPSBnZXRIaWVyYXJjaHlQYW5lbCgpO1xyXG4gICAgICAgIGlmIChoaWVyYXJjaHlQYW5lbCkge1xyXG4gICAgICAgICAgICAvLyDliJvlu7rlubbmjILovb0gVnVlIOW6lOeUqFxyXG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVIaWVyYXJjaHlBcHAoaGllcmFyY2h5UGFuZWwpO1xyXG4gICAgICAgICAgICAvLyDkv53lrZjliLDlhajlsYDlj5jph49cclxuXHJcbiAgICAgICAgICAgIHdpbmRvdy5oaWVyYXJjaHlBcHAgPSBhcHA7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVnVlIOW6lOeUqOWIm+W7uuaIkOWKnycsIGFwcCk7XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+acquaJvuWIsCBoaWVyYXJjaHkgcGFuZWwnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCfmk43kvZzlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgfVxyXG5cclxufSkoKTtcclxuXHJcbiJdfQ==