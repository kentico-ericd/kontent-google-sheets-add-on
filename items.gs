const getAllContentItems = () => {
  const allItems = [];
  const keys = loadKeys();
  let response = executeGetRequest(ITEMS_ENDPOINT);
  if(response.getResponseCode() === 200) {
    let json = JSON.parse(response.getContentText());
    allItems.push(...json.items);

    // Check if there are more items to get
    while(json.pagination.continuation_token) {
      
      const token = json.pagination.continuation_token;
      const url = json.pagination.next_page;
      const options = {
        'method': 'get',
        'contentType': 'application/json',
        'muteHttpExceptions': true,
        'headers': {
          'Authorization': 'Bearer ' + keys.cmkey,
          'x-continuation': token
        }
      }

      apiCounter++;
      response = UrlFetchApp.fetch(url, options);
      if(response.getResponseCode() === 200) {

        // Add items to list and continue loop
        json = JSON.parse(response.getContentText());
        allItems.push(...json.items);
      }
      else {
        errorCounter++;
        return {
          code: response.getResponseCode(),
          data: response.getContentText()
        };
      }
    }
  }
  else {
    errorCounter++;
    return {
      code: response.getResponseCode(),
      data: response.getContentText()
    };
  }

  // Finished loop without error, return all items
  return {
    code: 200,
    data: allItems
  }
}

const createNewItem = (type, name, externalId) => {
  if(stopProcessing) {
    return; 
  }
  
  let data;
  if(externalId === '') {
    data = {
      'name': name,
      'type': {
        'codename': type
      }
    };
  }
  else {
    data = {
      'name': name,
      'type': {
        'codename': type
      },
      'external_id': externalId.toString()
    };
  }

  const itemResponse = executeRequest(ITEMS_ENDPOINT, 'post', data);
  if(itemResponse.getResponseCode() === 201) {
    // Content item success
    itemCounter++;
    return {
      code: itemResponse.getResponseCode(),
      data: JSON.parse(itemResponse.getContentText())
    };
  }
  else {
    // Content item failure
    errorCounter++;
    let responseText = JSON.parse(itemResponse.getContentText());
    if(responseText.validation_errors) {
      responseText = responseText.validation_errors[0].message;
    }
    else {
      responseText = responseText.message;
    }
    return {
      code: itemResponse.getResponseCode(),
      data: responseText
    };
  }
}

const findById = (externalId) => {
  const response = executeGetRequest(ITEM_ENDPOINT, {external_id: externalId});
  if(response.getResponseCode() === 200) {
    // Success
    return JSON.parse(response.getContentText())
  }
}

const findByName = (name, type) => {
  const keys = loadKeys();
  // @ts-ignore
  const url = `${PREVIEW_ENDPOINT.formatUnicorn({project_id: keys.pid})}/items?system.name=${name}&system.type=${type}&elements=fakeelementname&depth=0`;
  const options = {
    'method': 'get',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + keys.previewkey
    }
  };

  apiCounter++;
  const response = UrlFetchApp.fetch(url, options);
  if(response.getResponseCode() === 200) {
    const json = JSON.parse(response.getContentText());
    if(json.items.length > 0) return json.items[0];
  }
}

const getExistingItem = (type, name, externalId) => {
  if(externalId !== '') {
    if(doPreload) {
      return contentItemCache.filter(i => i.external_id && i.external_id === externalId)[0];
    }
    else {
      // Make MAPI request
      return findById(externalId);
    }
  }
  else {
    if(doPreload) {
      return contentItemCache.filter(i => i.name === name)[0];
    }
    else {
      // Make Deliver request
      return findByName(name, type);
    }
  }
}