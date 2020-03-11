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
  const variantResponse = executeRequest(VARIANT_ENDPOINT, 'put', {'elements': elements}, {item_identifier: itemId, language_codename: lang});
  if(variantResponse.getResponseCode() === 200 || variantResponse.getResponseCode() === 201) {
    // Variant success
    variantCounter++;
    output.append('<li>Variant updated</li>');
  }
  else {
    // Variant failure
    errorCounter++;
    stopProcessing = true;
    let responseText = JSON.parse(variantResponse.getContentText());
    if(responseText.validation_errors) {
      responseText = responseText.validation_errors[0].message;
    }
    else {
      responseText = responseText.message;
    }
    output.append(`<li>Error upserting language variant: ${responseText}</li>`);
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