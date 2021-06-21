/**
-----------------------------------------------
  Import functions
-----------------------------------------------
**/

const getHeaders = () => {
  for (var i = 0; i < values[0].length; i++) {
    const value = values[0][i].toString().toLowerCase();
    switch (value) {
      case "language":
        langColumn = i;
        break;
      case "name":
        nameColumn = i;
        break;
      case "external_id":
        externalIdColumn = i;
        break;
      case "currency_format":
        currencyFormatColumn = i;
        break;
      case "codename":
        codenameColumn = i;
        break;
      case "rich_text_components":
        componentColumn = i;
        break;
    }
    headers.push(value);
  }

  // If no name column found, cancel
  if (nameColumn === -1) {
    showAlert('Your sheet needs to contain a "name" header');
    return;
  }
};

/**
 * Gets all sheet rows and the content type code name from the active sheet
 */
const loadSheetValues = () => {
  // Get ALL values from sheet
  const sheet = SpreadsheetApp.getActiveSheet();
  values = sheet.getDataRange().getValues();
  typeCodename = sheet.getName().toLowerCase();

  if (values[0].length < 1) {
    showAlert("Your sheet doesn't contain enough data to import!");
    return;
  }
};

/**
 * If doPreload is enabled, content items are requested from the project and saved in process
 */
const checkPreload = () => {
  // Load all content items into cache if enabled
  if (doPreload) {
    const itemsResponse = getAllContentItems();
    if (itemsResponse.code === 200) {
      contentItemCache = itemsResponse.data;
    } else {
      // Couldn't load items for some reason.. disable preload
      showAlert(
        `Couldn't load content items for cache: ${itemsResponse.data}... continuing without cache`
      );
      doPreload = false;
    }
  }
};

/**
 * Load sheet data and project info. Should only be called from UI Import menu, not from batching
 */
const initVars = () => {
  loadSheetValues();
  getHeaders();
  checkPreload();

  // Get default lang of project- if fails, we use "default"
  const langResponse = getDefaultLanguage();
  if (langResponse.code === 200) {
    defaultLang = langResponse.data.codename;
  }

  if (doUpdate) {
    // Get ID of Published/Draft workflow step for later use
    const stepResponse = getWorkflowSteps();
    if (stepResponse.code === 200) {
      stepResponse.data.forEach((step) => {
        if (step.name === "Published") {
          publishedWorkflowStepId = step.id;
        } else if (step.name === "Draft") {
          draftWorkflowStepId = step.id;
        }
      });
    } else {
      showAlert(`Failed to load workflow steps: ${stepResponse.data}`);
      return;
    }
  }

  // Get elements of type
  const typeResponse = getType(typeCodename);
  if (typeResponse.code === 200) {
    typeID = typeResponse.data.id;
    typeElements = getTypeElements(typeResponse.data);
  } else {
    // Content type failure
    showAlert(
      `Error getting elements for type ${typeCodename}: ${typeResponse.data}`
    );
    return;
  }
};

/**
 * Called from Import menu, get import options and begin importing first chunk
 */
const doImport = (e) => {
  clearCache();

  // Get form values from Import menu
  if (e.commonEventObject.formInputs) {
    doUpdate = e.commonEventObject.formInputs[KEY_DOUPDATE] ? true : false;
    doPreload = e.commonEventObject.formInputs[KEY_DOPRELOAD] ? true : false;
  }

  initVars();

  return upsertChunk(e);
};

const upsertChunk = (e) => {
  startTime = new Date();

  // Load data from cache and re-read Sheet if function was called from batching
  if (values.length === 0) {
    loadCache();
    loadSheetValues();
    getHeaders();
    checkPreload();
  }

  while (importingRowNum < values.length) {
    stopProcessing = false;
    // Init json result object for this row
    // Increase importingRowNum by 1 because values[] is 0-based but Sheet row numbers start at 1
    upsertResult = {
      row: importingRowNum + 1,
      name: "",
      updatedExisting: false,
      errors: [],
      results: [],
    };

    upsertRowData(values[importingRowNum]);

    // Add result json object to sheet result object
    resultJSON.push(upsertResult);
    importingRowNum++;

    // Check if it's been 30 seconds, if so cache data and prompt user to re-run
    if (isTimeUp() && importingRowNum < values.length) {
      updatePartialLog(e, false);
      cacheData();

      // Prompt user to re-run import for next chunk
      return showImportProgress(importingRowNum, values.length - 1);
    }
  }

  return updatePartialLog(e, true);
};

const upsertRowData = (rowValues) => {
  const name = nameColumn === -1 ? "" : rowValues[nameColumn].toString();
  const externalId =
    externalIdColumn === -1 ? "" : rowValues[externalIdColumn].toString();
  const codename =
    codenameColumn === -1 ? "" : rowValues[codenameColumn].toString();
  let lang = langColumn === -1 ? defaultLang : rowValues[langColumn];
  if (lang === "" || lang === undefined) lang = defaultLang;

  // Make sure we have some way to identify the item
  if (name === "" && externalId === "") {
    errorCounter++;
    stopProcessing = true;
    upsertResult.errors.push(`Row doesn't contain a name or external_id`);
    return;
  }
  upsertResult.name = name;

  if (!doUpdate) {
    const itemResponse = createNewItem(name, externalId, codename);
    if (itemResponse.code === 201) {
      // Item success
      const newItem = itemResponse.data;
      upsertResult.results.push(`Created new item with ID ${newItem.id}`);

      updateExistingItem(
        newItem,
        externalId,
        rowValues,
        true,
        lang,
        codename,
        name
      );
    } else {
      // Item failure
      upsertResult.errors.push(
        `Error creating content item: ${itemResponse.data}`
      );
      stopProcessing = true;
      return;
    }
  } else {
    const itemResponse = getExistingItem(name, externalId, codename);
    let existingItem = itemResponse.item;
    if (existingItem === undefined) {
      // No content item - create item, then variant
      const itemResponse = createNewItem(name, externalId, codename);
      if (itemResponse.code === 201) {
        // Item success
        existingItem = itemResponse.data;
        upsertResult.results.push(
          `Created new item with ID ${existingItem.id}`
        );
        updateExistingItem(
          existingItem,
          externalId,
          rowValues,
          true,
          lang,
          codename,
          name
        );
      } else {
        // Item failure
        upsertResult.errors.push(
          `Error creating content item: ${itemResponse.data}`
        );
        stopProcessing = true;
        return;
      }
    } else {
      // Content item found
      upsertResult.updatedExisting = true;

      // Response from CM endpoint stores ID in 'id' but Delivery stores it in 'system.id'
      const itemId =
        existingItem.id === undefined
          ? existingItem.system.id
          : existingItem.id;

      upsertResult.results.push(
        `Found existing item with ID ${itemId} by ${itemResponse.foundBy}`
      );
      updateExistingItem(
        existingItem,
        externalId,
        rowValues,
        false,
        lang,
        codename,
        name,
        itemResponse.foundBy
      );
    }
  }
};

const updateExistingItem = (
  existingItem,
  externalId,
  rowValues,
  isNew,
  lang,
  itemCodename,
  name,
  foundBy = ""
) => {
  if (stopProcessing) {
    return;
  }

  // Response from CM endpoint stores ID in 'id' but Delivery stores it in 'system.id'
  const itemId =
    existingItem.id === undefined ? existingItem.system.id : existingItem.id;

  if (!isNew) {
    // Check workflow, create new version or move to Draft
    const variantResponse = getExistingVariant(itemId, externalId, lang);
    if (variantResponse.code === 200) {
      // Variant Success - check workflow step
      const workflowStep = variantResponse.data.workflow_step.id;
      if (workflowStep === publishedWorkflowStepId) {
        // Create new version
        const versionResponse = createNewVersion(itemId, lang);
        if (versionResponse.code === 204) {
          // Version success - script continues to upsert variant
          upsertResult.results.push(
            `Created new version of "${lang}" language variant`
          );
        } else {
          // Version failure
          errorCounter++;
          stopProcessing = true;
          upsertResult.errors.push(
            `Error creating new version: ${versionResponse.data}`
          );
          return;
        }
      } else if (workflowStep !== draftWorkflowStepId) {
        // Move to draft
        const workflowResponse = moveToDraft(itemId, lang);
        if (workflowResponse.code === 204) {
          // Workflow success - script continues to upsert variant
          upsertResult.results.push(`Moved language variant to Draft step`);
        } else {
          // Workflow failure
          errorCounter++;
          stopProcessing = true;
          upsertResult.errors.push(
            `Error moving to Draft step: ${workflowResponse.data}`
          );
          return;
        }
      }
    }
  }

  // Create JS object with only row data for headers that match type elements
  const elements = [];
  for (var i = 0; i < headers.length; i++) {
    // Don't process pre-generated headers
    if (
      i === nameColumn ||
      i === codenameColumn ||
      i === langColumn ||
      i === currencyFormatColumn ||
      i === componentColumn ||
      i === externalIdColumn
    )
      continue;

    // Scan elements in type for same code name as header
    for (var k = 0; k < typeElements.length; k++) {
      if (typeElements[k].codename === headers[i]) {
        // Found matching element
        const currencyFormat =
          currencyFormatColumn === -1
            ? "US"
            : rowValues[currencyFormatColumn];
        let componentData;
        if (componentColumn > -1) {
          componentData = rowValues[componentColumn];
        }

        // Element-specific fixes to ensure data is in correct format for upsert
        const parsedValue = getValueForUpsert(rowValues[i], typeElements[k].type, typeElements[k].codename, currencyFormat, componentData);
        if(parsedValue) elements.push(parsedValue);
      }
    }
  }

  if (stopProcessing) return;

  // Check if we should update name or codename. If item is new, those values are already up-to-date
  if (!isNew) {
    const existingCodename = existingItem.codename
      ? existingItem.codename
      : existingItem.system.codename;
    const existingName = existingItem.name
      ? existingItem.name
      : existingItem.system.name;
    if (
      foundBy === "name" &&
      itemCodename !== "" &&
      itemCodename !== existingCodename
    ) {
      upsertItem(itemId, itemCodename, "", existingName);
    } else if (foundBy === "codename" && name !== existingName) {
      // We can update the name only
      upsertItem(itemId, "", name, existingName);
    } else if (foundBy === "external_id") {
      // We can update both codename and name, check if either of them are different from existing item found
      let nameToUpdate = name;
      if (nameToUpdate === existingName) nameToUpdate = "";

      let codenameToUpdate = itemCodename;
      if (codenameToUpdate === existingCodename) codenameToUpdate = "";

      if (nameToUpdate !== "" || codenameToUpdate !== "") {
        upsertItem(itemId, codenameToUpdate, nameToUpdate, existingName);
      }
    }
  }

  const variantResponse = updateVariant(elements, itemId, lang);
  if (variantResponse.code === 200 || variantResponse.code === 201) {
    // Variant success
    variantCounter++;
    upsertResult.results.push(`Updated "${lang}" language variant`);
  } else {
    // Variant failure
    errorCounter++;
    stopProcessing = true;
    if (variantResponse.data.validation_errors) {
      responseText = variantResponse.data.validation_errors[0].message;
    } else {
      responseText = variantResponse.data.message;
    }
    upsertResult.errors.push(
      `Error upserting language variant: ${responseText}`
    );
  }
};

/**
 * Creates the result Sheet if it doesn't exist. Appends results from the current chunk
 */
const updatePartialLog = (e, importComplete) => {
  let values = [];
  let sheet;
  let nextEmptyRow = -1;
  const numColumns = 5; // Increase if more headers are added

  if (resultSheetName === "") {
    // Result sheet doesn't exist yet
    resultSheetName = `Import log: ${new Date().toUTCString()}`;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet(resultSheetName);

    // Go back to import Sheet
    const importedSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(typeCodename);
    SpreadsheetApp.setActiveSheet(importedSheet);

    // Formatting
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 200);

    // Add headers
    values.push(["Row", "Name", "Created new item", "Errors", "Successes"]);
  } else {
    //Get existing result sheet
    sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(resultSheetName);
  }

  if (!sheet) {
    showAlert(
      "Result Sheet missing or cannot be created- did you delete it? Continuing import without log..."
    );
    return;
  } else {
    // Find an empty row where we can append new data
    nextEmptyRow = sheet.getLastRow() + 1;
  }

  // Loop through individual import records
  resultJSON.forEach((row) => {
    const errors = row.errors ? row.errors.join(", ") : "";
    const successes = row.results ? row.results.join(", ") : "";
    values.push([row.row, row.name, !row.updatedExisting, errors, successes]);
  });

  const range = sheet.getRange(nextEmptyRow, 1, values.length, numColumns);
  range.setValues(values);

  if (importComplete) {
    // Add stats (remember to fill empty cols with a value)
    values = [];
    values.push(["Content type:", typeCodename, "", "", ""]);
    values.push(["Seconds spent throttled:", waitTimes / 1000, "", "", ""]);
    values.push(["Total API Calls:", apiCounter, "", "", ""]);
    values.push(["New content items:", itemCounter, "", "", ""]);
    values.push(["Language variants updated:", variantCounter, "", "", ""]);
    values.push(["Total Errors:", errorCounter, "", "", ""]);
    values.push(["", "", "", "", ""]);

    sheet.insertRowsBefore(1, values.length);
    const range = sheet.getRange(1, 1, values.length, numColumns);
    range.setValues(values);

    return showImportComplete(resultSheetName);
  }
};
