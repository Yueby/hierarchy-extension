"use strict";Object.defineProperty(exports,"__esModule",{value:!0});class e{constructor(){}setHierarchyVue(e){this._hierarchyVue=e,console.log("设置 hierarchyVue:",this._hierarchyVue)}getDocument(){var e;return this._hierarchyVue?(null===(e=this._hierarchyVue.$el)||void 0===e?void 0:e.ownerDocument)||null:(console.warn("hierarchyVue 未初始化"),null)}getHierarchyPanel(){var e,o;const r=this.getDocument();if(!r)return null;const l=new Map,t=null===(o=null===(e=null==r?void 0:r.getElementsByTagName("dock-frame")[0])||void 0===e?void 0:e.shadowRoot)||void 0===o?void 0:o.querySelectorAll("panel-frame");return null==t||t.forEach((e=>{const o=e.getAttribute("name");o&&(console.log("name",o),l.set(o,e))})),l.get("hierarchy")||null}init(e){var o,r,l,t;const n=new Map,a=null===(r=null===(o=null==e?void 0:e.getElementsByTagName("dock-frame")[0])||void 0===o?void 0:o.shadowRoot)||void 0===r?void 0:r.querySelectorAll("panel-frame");null==a||a.forEach((e=>{const o=e.getAttribute("name");o&&(console.log("name",o),n.set(o,e))}));const u=null===(t=null===(l=n.get("hierarchy"))||void 0===l?void 0:l.shadowRoot)||void 0===t?void 0:t.querySelectorAll("ui-drag-area")[0];return u?(console.log("dragArea",u),u.__vue__):null}}const o=new e;exports.NodeTree=e,exports.nodeTree=o;
