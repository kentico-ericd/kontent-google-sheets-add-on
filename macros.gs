const LINK_TO_CONTENT_ITEM = '<a data-item-{identifier_type}="{identifier}">{text}</a>';
const LINK_TO_ASSET = '<a data-asset-{identifier_type}="{identifier}">{text}</a>';
const CONTENT_ITEM_LINK = '<object type="application/kenticocloud" data-type="item" data-{identifier_type}="{identifier}"></object>';
const REGEX = /##(.*?)##/g
const CONVERTERS = [
  ['link-item', LINK_TO_CONTENT_ITEM],
  ['link-asset', LINK_TO_ASSET],
  ['item', CONTENT_ITEM_LINK]
];

const parseRichText = (text) => {
  // A single index in this array will look like ["##macro##","macro"]
  const matches = [...text.matchAll(REGEX)];
  matches.forEach(match => {
    const resolved = convertMacro(match[0], match[1]);
    if(resolved) {
      text = text.replace(match[0], resolved);
    }
    else {
      // convertMacro returned null
      stopProcessing = true;
      errorCounter++;
      upsertResult.errors.push(`Error resolving macro ${match[0]}. Skipping row...`);
    }
  });
  return text;
}

const convertMacro = (fullMacro, innerText) => {
  // innerText should look like "link-item:id:5946ca5d-cebe-4be1-b5f0-4cd0a0e43fb5:coffee is good"
  const parts = innerText.split(':');
  if(parts.length >= 3) {
    const macroType = parts[0].trim();
    const idType = parts[1].trim();
    const id = parts[2].trim();
    // Find converter that matches parts[0]
    let converter = CONVERTERS.filter(c => c[0] === macroType);
    if(converter.length > 0) {
      converter = converter[0];
      let result = converter[1];
      // Replace parts of HTML with parts of innerText
      result = result.formatUnicorn({identifier_type: idType, identifier: id});
      if(parts.length === 4) {
        // HTML also contains {text} placeholder
        result = result.formatUnicorn({text: parts[3].trim()});
      }
      return result;
    }
    else {
      // Couldn't find matching converter
      return null;
    }
  }
}