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
  const keys = loadKeys();
  const allTypes = [];
  let response = executeGetRequest(TYPES_ENDPOINT);
  if (response.getResponseCode() === 200) {
    // Success
    let json = JSON.parse(response.getContentText());
    allTypes.push(...json.types);

    // Check if there are more types to get
    while (json.pagination.continuation_token) {
      const token = json.pagination.continuation_token;
      const url = json.pagination.next_page;
      const options = {
        method: "get",
        contentType: "application/json",
        muteHttpExceptions: true,
        headers: {
          Authorization: "Bearer " + keys.cmkey,
          "x-continuation": token,
        },
      };

      response = execute(url, options);
      if (response.getResponseCode() === 200) {
        // Add types to list and continue loop
        json = JSON.parse(response.getContentText());
        allTypes.push(...json.types);
      } else {
        errorCounter++;
        return {
          code: response.getResponseCode(),
          data: response.getContentText(),
        };
      }
    }
  } else {
    // Failure
    errorCounter++;
    return {
      code: response.getResponseCode(),
      data: JSON.parse(response.getContentText()).message,
    };
  }

  // Finished loop without error, return all types sorted by name
  const types = allTypes.sort(function (
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
      case "snippet": {
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
      }
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
 * Called from the Generate menu, creates a Sheet with the content type code name
 */
const makeSheetForType = (e) => {
  const typeCodeName = e.commonEventObject.formInputs[KEY_SELECTED_TYPE].stringInputs.value[0];
  makeSheet(typeCodeName);
};

const makeSheet = (typeCodeName) => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(typeCodeName);
  if (sheet != null) {
    showAlert("A sheet already exists with this content type code name.");
    return;
  }

  const newSheet = ss.insertSheet(typeCodeName);
  const contentType = getType(typeCodeName);
  if (contentType.code !== 200) {
    showAlert("Unable to retrieve content type.");
    return;
  }

  // Get elements and generate headers
  const elements = getTypeElements(contentType.data);
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
  return newSheet;
}
