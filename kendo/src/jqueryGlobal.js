// Kendo UI for jQuery reads the `jQuery` global instead of importing jQuery, so the
// global has to exist before `kendo.all.js` is evaluated. This module exists only to
// establish it, and `kendoRuntime.js` imports it first — ESM evaluates a module's
// dependencies in the order they are declared, which is what makes that ordering a
// guarantee rather than a hope.
import jQuery from "jquery";

window.jQuery = jQuery;
window.$ = jQuery;

export default jQuery;
