const exportContentItems = (e) => {

  // Check options selected
  if (e.commonEventObject.formInputs) {
    doTranslateIDs = e.commonEventObject.formInputs[KEY_TRANSLATEIDS] ? true : false;
  }
  if (doTranslateIDs) {
    // Clear cached objects as they may have changed since the app was loaded
    taxonomyCache = null, assetCache = null, choiceCache = null, modularCache = null;
  }

  // Try to get all items
  let allItems;
  const itemsResponse = getAllContentItems();
  if (itemsResponse.code === 200) {
    allItems = itemsResponse.data;
  }
  else {
    showAlert(`Error retrieving content items: ${itemsResponse.data}`);
    return;
  }

  // Get all languages to convert IDs to codenames when sheets are generated
  let languages;
  const langResponse = getAllLanguages();
  if (langResponse.code === 200) {
    languages = langResponse.data;
  }

  // Generate all Sheets
  let allTypes;
  const typeResponse = loadTypes();
  if (typeResponse.code === 200) {
    allTypes = typeResponse.data;
    allTypes.forEach(type => {

      const typeJson = JSON.stringify(type);
      makeSheetForType({ commonEventObject: { parameters: { json: typeJson } } });
    });
  }
  else {
    showAlert(`Error retrieving content types: ${typeResponse.data}`);
    return;
  }

  // Loop through types and add variants to Sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  allTypes.forEach(type => {

    const values = [];
    const sheet = ss.getSheetByName(type.codename);
    if (sheet != null) {

      const headers = sheet.getDataRange().getValues();
      let componentColumn = -1;
      for (let i = 0; i < headers[0].length; i++) {
        if (headers[0][i] === 'rich_text_components') {
          componentColumn = i;
          break;
        }
      }

      // Get all variants of this type
      const variantsResponse = getAllVariantsByType(type.codename);
      if (variantsResponse.code === 200) {
        for (const variant of variantsResponse.data) {

          let variantData = [];
          let components = [];
          for (const header of headers[0]) {

            // For all headers, get corresponding value in variant and format if needed
            const value = getValueForHeader(header, variant, type, allItems, languages, components, allTypes);
            variantData.push(value);
          }

          // Set the value of rich_text_components- it was skipped during getValueForHeader to ensure that
          // all rich text fields were parsed before this column is set
          if (componentColumn > -1) {
            if (components.length > 0) variantData[componentColumn] = JSON.stringify(components);
            else variantData[componentColumn] = '';
          }

          values.push(variantData);
        }
      }

      // Set sheet values
      if (values.length > 0) sheet.getRange(2, 1, values.length, values[0].length).setValues(values);
    }
  });
}

/**
 * Converts an element value returned from MAPI to the values expected by the addon (during importing).
 * If this is a rich text element, any components are added to the array of all components, which will be added to the Sheet
 * as its own column
 */
const parseElementValue = (variantElement, typeElement, components, allTypes) => {
  const value = variantElement.value;
  switch (typeElement.type) {
    case 'url_slug':
      if (variantElement.mode === 'autogenerated')
        return '#autogenerate#';
      else return value;

    case 'asset':
    case 'modular_content':
    case 'multiple_choice':
    case 'taxonomy':
      let retVal = '';
      for (const row of value) {

        if (doTranslateIDs) {
          // MAPI returns IDs of references for taxonomy, etc. Try to load codename/external-id instead
          const desiredRefType = (typeElement.type === 'asset') ? 'external_id' : 'codename';
          const newRef = getReferenceForObject(typeElement, Object.values(row)[0], desiredRefType, allTypes);
          retVal += newRef;
        }
        else {
          retVal += `${Object.keys(row)[0]}:${Object.values(row)[0]},`;
        }
      }
      // Trim trailing comma
      return retVal.slice(0, retVal.length - 1);

    case 'rich_text':
      if (variantElement.components && variantElement.components.length > 0) {
        // Add components to array of all components for this variant
        components.push(...variantElement.components);
      }
      return value;

    case 'text':
    case 'date_time':
    case 'number':
    default:
      return value;
  }
}

const getValueForHeader = (header, variant, type, allItems, languages, components, allTypes) => {
  const contentItem = allItems.filter(item => item.id === variant.item.id)[0];
  switch (header) {
    case 'name':
      return contentItem.name;
    case 'external_id':
      return contentItem.external_id;
    case 'codename':
      return contentItem.codename;
    case 'language':
      return languages.filter(lang => lang.id === variant.language.id)[0].codename;
    case 'rich_text_components':
      return '';
    default: break;
  }

  // Find element ID from type and get matching value from variant
  const typeElement = type.elements.filter(ele => ele.codename === header);
  if (typeElement.length === 1) {
    const elementId = typeElement[0].id;
    const variantElement = variant.elements.filter(ele => ele.element.id === elementId);
    if (variantElement.length === 1) {
      return parseElementValue(variantElement[0], typeElement[0], components, allTypes);
    }
  }

  return '';
}

/**
 * Translates an internal ID for an object into a codename or external_id. Returns a full reference with comma separator
 * like "codename:mytaxonomy," and will fallback on "id:123-456," if getting other reference fails
 */
const getReferenceForObject = (typeElement, refID, desiredRefType, allTypes) => {
  let newRef, match;
  switch (typeElement.type) {
    case 'asset':
      // Load cache if it hasn't been loaded yet
      if (!assetCache) {
        const assetResponse = getAllAssets();
        if (assetResponse.code === 200) {
          assetCache = assetResponse.data;
        }
        else {
          // Couldn't load assets, break to reference ID. Set cache to a string so we don't re-attempt the call each time
          assetCache = 'DISABLE';
          break;
        }
      }

      // Try to find asset by ID
      match = assetCache.filter(asset => asset.id === refID);
      if (match.length > 0) {
        newRef = match[0][desiredRefType];
      }
      else break;

    case 'multiple_choice':
      // Load cache if it hasn't been loaded yet. For multiple choice, all options are availble in the allTypes list of content types
      if (!choiceCache) {
        choiceCache = [];
        allTypes.forEach(type => {
          const multiChoiceElements = type.elements.filter(e => e.type === 'multiple_choice');
          for (const ele of multiChoiceElements) {
            choiceCache.push(...ele.options);
          }
        });
      }

      // Try to find choice by ID
      match = choiceCache.filter(choice => choice.id === refID);
      if (match.length > 0) {
        newRef = match[0][desiredRefType];
      }
      else break;

    case 'modular_content':
      // Load cache if it hasn't been loaded yet
      if (!modularCache) {
        const modularResponse = getAllContentItems();
        if (modularResponse.code === 200) {
          modularCache = modularResponse.data;
        }
        else {
          // Couldn't load taxonomies, break to reference ID. Set cache to a string so we don't re-attempt the call each time
          modularCache = 'DISABLE';
          break;
        }
      }

      // Try to find item by ID
      match = modularCache.filter(item => item.id === refID);
      Logger.log(`match=${match}`);
      if (match.length > 0) {
        newRef = match[0][desiredRefType];
      }
      else break;

    case 'taxonomy':
      // Load cache if it hasn't been loaded yet
      if (!taxonomyCache) {
        const taxonomyResponse = getAllTaxonomyTerms();
        if (taxonomyResponse.code === 200) {
          taxonomyCache = taxonomyResponse.data;
        }
        else {
          // Couldn't load taxonomies, break to reference ID. Set cache to a string so we don't re-attempt the call each time
          taxonomyCache = 'DISABLE';
          break;
        }
      }

      // Try to find term by ID
      match = taxonomyCache.filter(term => term.id === refID);
      if (match.length > 0) {
        newRef = match[0][desiredRefType];
      }
      else break;
  }

  if (newRef && newRef !== '') return `${desiredRefType}:${newRef},`;

  // Fallback on ID reference
  return `id:${refID},`;
}
