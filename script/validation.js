/**
 * Called from the Validate Sheet card to validate each cell in the current Sheet
 */
const validateSheet = (e) => {
  let typeElements;
  const sheet = SpreadsheetApp.getActiveSheet();
  const typeCodename = sheet.getSheetName();

  const typeResponse = getType(typeCodename);
  if (typeResponse.code === 200) {
    typeElements = getTypeElements(typeResponse.data);
  } else {
    // Content type failure
    showAlert(
      `Error getting elements for type ${typeCodename}: ${typeResponse.data}`
    );
    return;
  }

  // Loop through headers and find corresponding type element
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var col = 0; col < headers.length; col++) {
    let element = typeElements.filter((e) => e.codename === headers[col]);
    if (element.length > 0) {
      element = element[0];
      // Only validate supported element types
      if (element.type === "rich_text")
        validateColumn(
          sheet,
          col + 1,
          element.type,
          headers.indexOf("rich_text_components")
        );
    }
  }
};

const validateColumn = (sheet, sheetColumn, elementType, componentIndex) => {
  const values = sheet
    .getRange(2, sheetColumn, sheet.getLastRow() - 1, 1)
    .getValues();

  for (var row = 0; row < values.length; row++) {
    let value = values[row][0];
    switch (elementType) {
      case "rich_text":
        validateRichText(sheet, row, value, sheetColumn, componentIndex);
        break;
    }
  }
};

const validateRichText = (sheet, row, value, sheetColumn, componentIndex) => {
  // Convert custom ##macros##
  value = parseRichText(value);

  const valueRange = sheet.getRange(row + 2, sheetColumn),
    componentRange = sheet.getRange(row + 2, componentIndex + 1),
    result = AppLib.validateRichText(value);
  let success = result.success;

  if (!success) {
    // Failure
    addError(valueRange, result.message);
    return;
  } else {
    // Validate components exist in rich_text_components column, only if rich text contains OBJECT tags
    const tagMatches = [...value.matchAll(TAG_REGEX)];
    if (tagMatches.length > 0) {
      try {
        const componentJSON = JSON.parse(componentRange.getValue());
        if(!(componentJSON instanceof Array)) {
          // Components must be an array
          throw new Error('Must be an array');
        }

        tagMatches.forEach((match) => {
          if (match[2] === "component") {
            const componentID = match[3];
            const componentMatches = componentJSON.filter(
              (i) => i.id === componentID
            );
            if (componentMatches.length === 0) {
              // ID in rich text not found in component JSON
              addError(
                valueRange,
                `Component with ID ${componentID} not found in rich_text_components column.`
              );
              success = false;
            }
          }
        });
      } catch (e) {
        // Component JSON couldn't be parsed
        success = false;
        addError(valueRange, `Error in rich_text_components column: ${e}`);
      }
      finally {
        // RTE validation and component validation succeeded
        if (success) {
          addSuccess(valueRange);
        }
      }
    } else {
      // RTE validation succeeded without components
      addSuccess(valueRange);
    }
  }
};

const clearFormatting = (range) => {
  range.clearNote();
  range.setBackground("#ffffff");
}

const addError = (range, message) => {
  range.clearNote();
  range.setBackground("#FF9696");
  range.setNote(message);
};

const addSuccess = (range) => {
  range.clearNote();
  range.setBackground("#BBE2B3");
};
