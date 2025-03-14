"use strict";!function(){var e;const t={id:"node-activator",className:"hierarchy-node-activator",priority:90,isVisible:e=>!0,onCreate(e,t){let o=t.querySelector("."+this.className);o?o.value=e.active:(o=document.createElement("ui-checkbox"),o.className=this.className,o.value=e.active,o.style.cssText="\n                    position: absolute;\n                    right: 4px;\n                    top: 50%;\n                    transform: translateY(-50%);\n                    pointer-events: auto;\n                    z-index: 999;\n                ",t.appendChild(o)),o.addEventListener("mousedown",(e=>{e.stopPropagation()})),o.addEventListener("click",(e=>{e.stopPropagation()}));const i=t=>{t.stopPropagation();const i=o.value;window.utils.log(window.utils.LogLevel.DEBUG,"NodeActivator","节点激活状态变更:",i),Editor.Message.request("scene","set-property",{uuid:e.uuid,path:"active",dump:{type:"Boolean",value:i}})};o.removeEventListener("change",i),o.addEventListener("change",i)},onUpdate(e,t){const o=t.querySelector("."+this.className);o&&(o.value=e.active)},onDestroy(){}};if(null===(e=window.hierarchy)||void 0===e?void 0:e.extension)try{window.hierarchy.extension.add(t)}catch(e){window.utils.log(window.utils.LogLevel.ERROR,"NodeActivator","扩展初始化失败:",e)}else window.utils.log(window.utils.LogLevel.ERROR,"NodeActivator","无法初始化扩展: hierarchy未就绪")}();
