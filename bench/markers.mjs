// Replaces generated content between a marker pair; missing markers are errors.

const open = (name) => `<!-- BENCH:${name} -->`;
const close = (name) => `<!-- /BENCH:${name} -->`;

export function replaceBetweenMarkers(text, name, body) {
  const start = text.indexOf(open(name));
  const end = text.indexOf(close(name));

  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `missing marker pair ${open(name)} … ${close(name)} — add both to the document ` +
        "before generating into it"
    );
  }

  return (
    text.slice(0, start + open(name).length) +
    `\n\n${body.trim()}\n\n` +
    text.slice(end)
  );
}
