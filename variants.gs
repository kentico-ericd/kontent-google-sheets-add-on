const createNewVersion = (itemId, lang) => {
  if(stopProcessing) {
    return; 
  }
  
  const response = executeRequest(NEWVERSION_ENDPOINT, 'put', null, {item_identifier:  itemId, language_codename: lang});
  if(response.getResponseCode() === 204) {
    // Success
    return {
      'code': 204
    };
  }
  // Failure
  return {
    'code': response.getResponseCode(),
    'data': JSON.parse(response.getContentText()).message
  };
}

const updateVariant = (elements, itemId, lang) => {
  const response = executeRequest(VARIANT_ENDPOINT, 'put', {'elements': elements}, {item_identifier: itemId, language_codename: lang});
  return {
    code: response.getResponseCode(),
    data: JSON.parse(response.getContentText())
  }
}

const getExistingVariant = (itemId, externalId, lang) => {
  let identifier;
  if(externalId !== '') {
    identifier = 'external-id/' + externalId;
  }
  else {
    identifier = itemId;
  }

  const response = executeGetRequest(VARIANT_ENDPOINT, {item_identifier: identifier, language_codename: lang});
  if(response.getResponseCode() === 200) {
    // Variant success
    return {
      'code': 200,
      'data': JSON.parse(response.getContentText())
    }
  }
  else {
    // Variant failure
    return {
      'code': response.getResponseCode(),
      'data': JSON.parse(response.getContentText()).message
    }
  }
}