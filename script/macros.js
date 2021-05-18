const parseRichText = (text) => {
  // A single index in this array will look like ["##macro##","macro"]
  const matches = [...text.matchAll(REGEX)];
  matches.forEach((match) => {
    const resolved = convertMacro(match[0], match[1]);
    if (resolved) {
      text = text.replace(match[0], resolved);
    } else {
      // convertMacro returned null
      stopProcessing = true;
      errorCounter++;
      upsertResult.errors.push(
        `Error resolving macro ${match[0]}. Skipping row...`
      );
    }
  });
  return text;
};

const convertMacro = (fullMacro, innerText) => {
  // innerText should look like "link-item:id:5946ca5d-cebe-4be1-b5f0-4cd0a0e43fb5:coffee is good"
  const parts = innerText.split(":");
  if (parts.length >= 3) {
    const macroType = parts[0].trim();
    const idType = parts[1].trim();
    const id = parts[2].trim();
    // Find converter that matches parts[0]
    let converter = CONVERTERS.filter((c) => c[0] === macroType);
    if (converter.length > 0) {
      converter = converter[0];
      let result = converter[1];
      // Replace parts of HTML with parts of innerText
      result = result.formatUnicorn({
        identifier_type: idType,
        identifier: id,
      });
      if (parts.length === 4) {
        // HTML also contains {text} placeholder
        result = result.formatUnicorn({ text: parts[3].trim() });
      }
      return result;
    } else {
      // Couldn't find matching converter
      return null;
    }
  }
};

const insertMacro = (e) => {
  const macro = e.parameters.macro;
  const formInput = e.commonEventObject.formInputs;
  let identifier, identifierType, output;

  switch (macro) {
    case KEY_INLINEITEM_IDENTIFIER:
      identifier = formInput[KEY_INLINEITEM_IDENTIFIER].stringInputs.value[0];
      identifierType =
        formInput[KEY_INLINEITEM_IDENTIFIERTYPE].stringInputs.value[0];
      output = MACRO_TEMPLATE_INLINEITEM.formatUnicorn({
        identifier_type: identifierType,
        identifier: identifier,
      });
      break;
    case KEY_ITEMLINK_IDENTIFIER: {
      identifier = formInput[KEY_ITEMLINK_IDENTIFIER].stringInputs.value[0];
      identifierType =
        formInput[KEY_ITEMLINK_IDENTIFIERTYPE].stringInputs.value[0];
      const linkText = formInput[KEY_ITEMLINK_TEXT].stringInputs.value[0];
      output = MACRO_TEMPLATE_ITEMLINK.formatUnicorn({
        identifier_type: identifierType,
        identifier: identifier,
        text: linkText,
      });
      break;
    }
    case KEY_ASSETLINK_IDENTIFIER: {
      identifier = formInput[KEY_ASSETLINK_IDENTIFIER].stringInputs.value[0];
      identifierType =
        formInput[KEY_ASSETLINK_IDENTIFIERTYPE].stringInputs.value[0];
      const assetText = formInput[KEY_ASSETLINK_TEXT].stringInputs.value[0];
      output = MACRO_TEMPLATE_ASSETLINK.formatUnicorn({
        identifier_type: identifierType,
        identifier: identifier,
        text: assetText,
      });
      break;
    }
  }

  if (output) {
    // Insert macro in active cell
    const cell = SpreadsheetApp.getActiveSheet().getActiveCell();
    const cellValue = cell.getValue();
    cell.setValue(cellValue + output);
  }
};
