const ITEMS_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items';
const ITEM_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/external-id/{external_id}';

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
  const url = `${PREVIEW_ENDPOINT.formatUnicorn({project_id: keys.pid})}/items?system.name=${name}&system.type=${type}`;
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
  if(externalId !== '') return findById(externalId);
  else return findByName(name, type);
}