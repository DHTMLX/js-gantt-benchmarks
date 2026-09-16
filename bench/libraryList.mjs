// The measured library list shared by the README and round reports.

import { LIBS } from "./config.mjs";
import { versionsFrom } from "./tables.mjs";

export function renderLibraryList(metricRows) {
  const versions = versionsFrom(metricRows);
  return LIBS.map(
    (lib) => `- [**${lib.name}** v${versions[lib.id]}](${lib.docs})`
  ).join("\n");
}
