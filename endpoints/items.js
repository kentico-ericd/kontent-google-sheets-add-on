const getAllContentItems = () => {
  const allItems = [];
  const keys = loadKeys();
  let response = executeGetRequest(ITEMS_ENDPOINT);
  if (response.getResponseCode() === 200) {
    let json = JSON.parse(response.getContentText());
    allItems.push(...json.items);

    // Check if there are more items to get
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
        // Add items to list and continue loop
        json = JSON.parse(response.getContentText());
        allItems.push(...json.items);
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
    data: allItems,
  };
};

const createNewItem = (name, externalId, codename) => {
  if (stopProcessing) {
    return;
  }

  const data = {
    name: name,
    type: {
      codename: typeCodename,
    },
  };

  if (externalId !== "") data.external_id = externalId;
  if (codename !== "") data.codename = codename;

  const itemResponse = executeRequest(ITEMS_ENDPOINT, "post", data);
  if (itemResponse.getResponseCode() === 201) {
    // Content item success
    itemCounter++;

    // Add new item to cache in case we need to find it later
    const item = JSON.parse(itemResponse.getContentText());
    contentItemCache.push(item);

    return {
      code: itemResponse.getResponseCode(),
      data: item,
    };
  } else {
    // Content item failure
    errorCounter++;
    let responseText = JSON.parse(itemResponse.getContentText());
    if (responseText.validation_errors) {
      responseText = responseText.validation_errors[0].message;
    } else {
      responseText = responseText.message;
    }
    return {
      code: itemResponse.getResponseCode(),
      data: responseText,
    };
  }
};

const findById = (externalId) => {
  const response = executeGetRequest(ITEM_ENDPOINT, {
    external_id: externalId,
  });
  if (response.getResponseCode() === 200) {
    // Success
    return JSON.parse(response.getContentText());
  }
};

const findByCodename = (codename) => {
  const response = executeGetRequest(ITEM_BYCODENAME_ENDPOINT, {
    codename: codename,
  });
  if (response.getResponseCode() === 200) {
    // Success
    return JSON.parse(response.getContentText());
  }
};

const findByName = (name) => {
  const keys = loadKeys();
  // @ts-ignore
  const url = `${PREVIEW_ENDPOINT.formatUnicorn({
    project_id: keys.pid,
  })}/items?system.name=${name}&system.type=${typeCodename}&elements=fakeelementname&depth=0`;
  const options = {
    method: "get",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + keys.previewkey,
      "X-KC-Wait-For-Loading-New-Content": true,
    },
  };

  apiCounter++;
  const response = execute(url, options);
  if (response.getResponseCode() === 200) {
    const json = JSON.parse(response.getContentText());
    if (json.items.length > 0) return json.items[0];
  }
};

/**
 * Updates the name or codename of a content item
 */
const upsertItem = (itemId, codename, nameToUpdate, existingName) => {
  const data = {};
  let updatedParts = [];

  if (codename !== "") {
    data.codename = codename;
    updatedParts.push("codename");
  }
  if (nameToUpdate !== "") {
    data.name = nameToUpdate;
    updatedParts.push("name");
  } else {
    data.name = existingName;
  }

  const itemResponse = executeRequest(ITEM_ID_ENDPOINT, "put", data, {
    id: itemId,
  });
  if (itemResponse.getResponseCode() === 200) {
    upsertResult.results.push(
      `Updated the ${updatedParts.join("/")} of item ${itemId}`
    );
    return {
      code: 200,
      data: "",
    };
  } else {
    errorCounter++;
    let response = JSON.parse(itemResponse.getContentText());
    upsertResult.errors.push(
      `Failed to update the ${updatedParts.join("/")} of item ${itemId}: ${
        response.validation_errors[0].message
      }`
    );
    return {
      code: itemResponse.getResponseCode(),
      data: response.validation_errors[0].message,
    };
  }
};

/**
 * Gets a content item by its name, codename, or external ID from cache or Kontent if cache not available. Returns an object where 'item' contains the located item, and 'foundBy' indicates which property the item was located with.
 */
const getExistingItem = (name, externalId, codename) => {
  let item;
  if (externalId !== "") {
    if (doPreload) {
      item = contentItemCache.filter(
        (i) =>
          i.external_id && i.external_id === externalId && i.type.id === typeID
      )[0];
      return {
        item: item,
        foundBy: "external_id",
      };
    } else {
      // Make MAPI request
      item = findById(externalId);
      return {
        item: item,
        foundBy: "external_id",
      };
    }
  } else if (codename !== "") {
    if (doPreload) {
      item = contentItemCache.filter(
        (i) => i.codename === codename && i.type.id === typeID
      )[0];
      return {
        item: item,
        foundBy: "codename",
      };
    } else {
      // Make MAPI request
      item = findByCodename(codename);
      return {
        item: item,
        foundBy: "codename",
      };
    }
  } else {
    if (doPreload) {
      item = contentItemCache.filter(
        (i) => i.name === name && i.type.id === typeID
      )[0];
      return {
        item: item,
        foundBy: "name",
      };
    } else {
      // Make Deliver request
      item = findByName(name);
      return {
        item: item,
        foundBy: "name",
      };
    }
  }
};
