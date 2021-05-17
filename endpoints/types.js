const getType = (codename) => {
  const response = executeGetRequest(TYPE_ENDPOINT, { code_name: codename });
  if (response.getResponseCode() === 200) {
    // Success
    return {
      code: 200,
      data: JSON.parse(response.getContentText()),
    };
  }
  // Failure
  return {
    code: response.getResponseCode(),
    data: JSON.parse(response.getContentText()).message,
  };
};

const loadTypes = () => {
  const response = executeGetRequest(TYPES_ENDPOINT);
  if (response.getResponseCode() === 200) {
    // Success
    const types = JSON.parse(response.getContentText()).types.sort(function (
      a,
      b
    ) {
      var val1 = a.name.toUpperCase();
      var val2 = b.name.toUpperCase();
      if (val1 < val2) {
        return -1;
      }
      if (val1 > val2) {
        return 1;
      }

      return 0;
    });
    return {
      code: 200,
      data: types,
    };
  }
  // Failure
  return {
    code: response.getResponseCode(),
    data: JSON.parse(response.getContentText()).message,
  };
};

const getSnippetElements = (id) => {
  const response = executeGetRequest(SNIPPET_ENDPOINT, {
    snippet_identifier: id,
  });
  if (response.getResponseCode() === 200) {
    // Success
    return {
      code: 200,
      data: JSON.parse(response.getContentText()).elements,
    };
  } else {
    // Failure
    return {
      code: response.getResponseCode(),
      data: JSON.parse(response.getContentText()).message,
    };
  }
};

/**
 * Gets type elements and expands on snippet elements to include in the resulting array
 **/
const getTypeElements = (type) => {
  const elements = [];
  type.elements.forEach((e) => {
    switch (e.type) {
      case "snippet":
        const response = getSnippetElements(e.snippet.id);
        if (response.code === 200) {
          let snippetElements = response.data;
          // Remove guidelines
          snippetElements = snippetElements.filter(
            (s) => s.type !== "guidelines"
          );
          Array.prototype.push.apply(elements, snippetElements);
        }
        break;
      case "guidelines":
        break; // Don't add guidelines
      default:
        elements.push(e);
        break;
    }
  });
  return elements;
};

/**
 * Called from Generate and Export menu, creates a Sheet with the content type code name
 */
const makeSheetForType = (e) => {
  const contentType = JSON.parse(e.commonEventObject.parameters.json);

  // Check if sheet with code name already exists
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(contentType.codename);
  if (sheet != null) {
    showAlert("A sheet already exists with this content type code name.");
    return;
  }

  const newSheet = ss.insertSheet(contentType.codename);
  const elements = getTypeElements(contentType);

  // Generate headers
  const headers = [
    "name",
    "external_id",
    "codename",
    "language",
    "currency_format",
  ];
  for (var i = 0; i < elements.length; i++) {
    headers.push(elements[i].codename);
  }

  // Add component header to end
  headers.push("rich_text_components");

  const range = newSheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
};
