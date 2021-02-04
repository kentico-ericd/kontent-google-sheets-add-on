const getType = (codename) => {
  const response = executeGetRequest(TYPE_ENDPOINT, {code_name: codename});
  if(response.getResponseCode() === 200) {
    // Success
    return {
      'code': 200,
      'data': JSON.parse(response.getContentText())
    };
  }
  // Failure
  return {
    'code': response.getResponseCode(),
    'data': JSON.parse(response.getContentText()).message
  };
}


const loadTypes = () => {
  const response = executeGetRequest(TYPES_ENDPOINT);
  if(response.getResponseCode() === 200) {
    // Success
    return {
      'code': 200,
      'data': JSON.parse(response.getContentText()).types
    };
  }
  // Failure
  return {
    'code': response.getResponseCode(),
    'data': JSON.parse(response.getContentText()).message
  };
}

const getSnippetElements = (id) => {
  const response = executeGetRequest(SNIPPET_ENDPOINT, {snippet_identifier: id});
  if(response.getResponseCode() === 200) {
    // Success
    return {
      'code': 200,
      'data': JSON.parse(response.getContentText()).elements
    }
  }
  else {
    // Failure
    return {
      'code': response.getResponseCode(),
      'data': JSON.parse(response.getContentText()).message
    }
  }
}

/**
* Gets type elements and expands on snippet elements to include in the resulting array
**/
const getTypeElements = (type) => {
  const elements = [];
  type.elements.forEach(e => {
        switch(e.type) {
          case "snippet":
            const response = getSnippetElements(e.snippet.id);
            if(response.code === 200) {
              let snippetElements = response.data;
              // Remove guidelines
              snippetElements = snippetElements.filter(s => s.type !== "guidelines");
              Array.prototype.push.apply(elements, snippetElements);
            }
            break;
          case "guidelines": break; // Don't add guidelines
          default:
            elements.push(e);
          break;
        }
  });
  return elements;
}

/**
 * Called from Generate menu, creates a Sheet with the content type code name
 */
const makeSheetForType = (e) => {
  const contentType = JSON.parse(e.commonEventObject.parameters.json);

  // Check if sheet with code name already exists
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(contentType.codename);
  if (sheet != null) {
    showAlert('A sheet already exists with this content type code name.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const newSheet = ss.insertSheet(contentType.codename);
  const elements = getTypeElements(contentType);

  // Generate headers
  const range = newSheet.getRange(1, 1, 1, elements.length + 4);
  range.getCell(1, 1).setValue('name');
  range.getCell(1, 2).setValue('external_id');
  range.getCell(1, 3).setValue('codename');
  range.getCell(1, 4).setValue('currency_format').setNote('Set this to "US" (or leave empty) for numbers formatted like "1,000.50" or "EU" for "1 000,50" formatting.');

  for (var i = 0; i < elements.length; i++) {
    range.getCell(1, i + 5).setValue(elements[i].codename);
  }
}