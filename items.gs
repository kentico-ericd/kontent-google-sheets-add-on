const ITEMS_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items';
const ITEM_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/external-id/{external_id}';
const PREVIEW_ENDPOINT = 'https://preview-deliver.kontent.ai/{project_id}';

const getAllContentItemsDeliver = () => {
  const keys = loadKeys();
  // @ts-ignore
  const url = `${PREVIEW_ENDPOINT.formatUnicorn({project_id: keys.pid})}/items?elements=fakeelementname&depth=0`;
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
    return {
      code: response.getResponseCode(),
      data: json.items
    };
  }
  else {
    errorCounter++;
    return {
      code: response.getResponseCode(),
      data: response.getContentText()
    };
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

const getExistingItem = (type, name, externalId, usingDeliverCache) => {
  if(externalId !== '') {
    // If getting item by externalId, we have to make a MAPI request (unless we cache all items from MAPI..)
    return findById(externalId);
  }
  else {
    // If not using externalId we can check cache
    if(usingDeliverCache) {
      return contentItemCache.filter(i => i.system.name === name)[0];
    }
    else {
      // Make Deliver request
      return findByName(name, type);
    }
  }
}