const getAllVariantsByType = (typeCodename) => {
  const allVariants = [];
  const keys = loadKeys();
  let response = executeGetRequest(VARIANTSBYTYPE_ENDPOINT, {
    type_codename: typeCodename,
  });
  if (response.getResponseCode() === 200) {
    let json = JSON.parse(response.getContentText());
    allVariants.push(...json.variants);

    // Check if there are more variants to get
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
        // Add variants to list and continue loop
        json = JSON.parse(response.getContentText());
        allVariants.push(...json.variants);
      } else {
        errorCounter++;
        return {
          code: response.getResponseCode(),
          data: response.getContentText(),
        };
      }
    }
  } else {
    errorCounter++;
    return {
      code: response.getResponseCode(),
      data: response.getContentText(),
    };
  }

  // Finished loop without error, return all items
  return {
    code: 200,
    data: allVariants,
  };
};

const createNewVersion = (itemId, lang) => {
  if (stopProcessing) {
    return;
  }

  const response = executeRequest(NEWVERSION_ENDPOINT, "put", null, {
    item_identifier: itemId,
    language_codename: lang,
  });
  if (response.getResponseCode() === 204) {
    // Success
    return {
      code: 204,
    };
  }
  // Failure
  return {
    code: response.getResponseCode(),
    data: JSON.parse(response.getContentText()).message,
  };
};

const updateVariant = (elements, itemId, lang) => {
  const response = executeRequest(
    VARIANT_ENDPOINT,
    "put",
    { elements: elements },
    { item_identifier: itemId, language_codename: lang }
  );
  return {
    code: response.getResponseCode(),
    data: JSON.parse(response.getContentText()),
  };
};

const getExistingVariant = (itemId, externalId, lang) => {
  let identifier;
  if (externalId !== "") {
    identifier = "external-id/" + externalId;
  } else {
    identifier = itemId;
  }

  const response = executeGetRequest(VARIANT_ENDPOINT, {
    item_identifier: identifier,
    language_codename: lang,
  });
  if (response.getResponseCode() === 200) {
    // Variant success
    return {
      code: 200,
      data: JSON.parse(response.getContentText()),
    };
  } else {
    // Variant failure
    return {
      code: response.getResponseCode(),
      data: JSON.parse(response.getContentText()).message,
    };
  }
};
