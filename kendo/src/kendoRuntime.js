// Kendo UI and its theme from the installed packages, not Telerik's CDN: nothing is
// fetched over the network at run time and the version under test cannot change
// without this repository changing.
//
// Import order matters — see jqueryGlobal.js.
import jQuery from "./jqueryGlobal.js";
import "@progress/kendo-ui";
import "@progress/kendo-theme-default/dist/default-main.css";

// kendo.all.js publishes itself on window; re-exported here so the app has one place
// that knows how this library is loaded.
export const kendo = window.kendo;
export const $ = jQuery;
