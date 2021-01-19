// Import variables
let apiCounter = 0, itemCounter = 0, variantCounter = 0, errorCounter = 0;
let stopProcessing = false;
let publishedWorkflowStepId, draftWorkflowStepId;
let langColumn = -1, nameColumn = -1, externalIdColumn = -1, currencyFormatColumn = -1;
// JSON objects for import results: main object for storing all results, single object used in each row
let resultJSON = { rows: [], stats: {} }, upsertResult = {};

const showAlert = (message) => {
  let ui = SpreadsheetApp.getUi();
  ui.alert(
    'Error',
    message,
    ui.ButtonSet.OK);
}

const loadKeys = () => {
  const pid = PropertiesService.getUserProperties().getProperty('pid');
  const cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  const previewkey = PropertiesService.getUserProperties().getProperty('previewkey');
  return { "pid": pid, "cmkey": cmkey, "previewkey": previewkey };
}

/**
-----------------------------------------------
  Sheet functions
-----------------------------------------------
**/

const makeResultSheet = (e) => {
  //TODO: locale not working- returns "en" not "en-US"
  //const locale = e.commonEventObject.userLocale;
  //const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const newSheet = ss.insertSheet(`Import log: ${new Date().toUTCString()}`);

  // Add stats
  newSheet.appendRow(['Content type:', resultJSON.stats.type]);
  newSheet.appendRow(['Total API Calls:', resultJSON.stats.apiCounter]);
  newSheet.appendRow(['New content items:', resultJSON.stats.itemCounter]);
  newSheet.appendRow(['Language variants updated:', resultJSON.stats.variantCounter]);
  newSheet.appendRow(['Total Errors:', resultJSON.stats.errorCounter]);
  newSheet.appendRow([' ']);
  newSheet.appendRow(['Row', 'Name', 'Created new item', 'Errors', 'Successes']);

  // Loop through individual import records
  resultJSON.rows.forEach(row => {
    const errors = row.errors ? row.errors.join(', ') : '';
    const successes = row.results ? row.results.join(', ') : '';
    newSheet.appendRow([row.row, row.name, !row.updatedExisting.toString().toLowerCase(), errors, successes]);
  });

  newSheet.activate();
}

const makeSheet = (e) => {
  const type = JSON.parse(e.commonEventObject.parameters.json);

  // Check if sheet with code name already exists
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(type.codename);
  if (sheet != null) {
    showAlert('A sheet already exists with this content type code name.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const newSheet = ss.insertSheet(type.codename);
  const elements = getTypeElements(type);

  // Generate headers
  const range = newSheet.getRange(1, 1, 1, elements.length + 3);
  range.getCell(1, 1).setValue("name");
  range.getCell(1, 2).setValue("external_id");
  range.getCell(1, 3).setValue("currency_format").setNote('Set this to "US" (or leave empty) for numbers formatted like "1,000.50" or "EU" for "1 000,50" formatting.');

  for (var i = 0; i < elements.length; i++) {
    range.getCell(1, i + 4).setValue(elements[i].codename);
  }
}

/**
-----------------------------------------------
  Import functions
-----------------------------------------------
**/

const doImport = (e) => {
  // There's only one input in the form, so if there's any values then it was checked
  let doUpdate = e.commonEventObject.formInputs ? true : false;

  // Reset global vars
  apiCounter = 0;
  itemCounter = 0;
  variantCounter = 0;
  errorCounter = 0;
  langColumn = -1;
  nameColumn = -1;
  externalIdColumn = -1;
  currencyFormatColumn = -1;
  resultJSON = { rows: [], stats: {} };

  const sheet = SpreadsheetApp.getActiveSheet();
  const cols = sheet.getLastColumn();
  const rows = sheet.getLastRow();
  const type = sheet.getName().toLowerCase();

  if (cols < 1) {
    showAlert('Your sheet doesn\'t contain enough data to import!');
    return;
  }

  const headerRow = sheet.getRange(1, 1, 1, cols).getValues();
  const headers = [];

  // Get all header values
  for (var i = 0; i < cols; i++) {
    const value = headerRow[0][i].toString().toLowerCase();
    switch (value) {
      case "language":
        langColumn = i
        break;
      case "name":
        nameColumn = i
        break;
      case "external_id":
        externalIdColumn = i
        break;
      case "currency_format":
        currencyFormatColumn = i;
        break;
    }
    headers.push(value);
  }

  // If no name column found, cancel
  if (nameColumn === -1) {
    showAlert('Your sheet needs to contain a "name" header');
    return;
  }

  // Get default lang of project or use the "default" language in new projects
  const langResponse = getDefaultLanguage();
  let defaultLang;
  if (langResponse.code === 200) {
    defaultLang = langResponse.data.codename;
  }
  else {
    defaultLang = 'default';
  }

  if (doUpdate) {
    // Get ID of Published/Draft workflow step for later use
    const stepResponse = getWorkflowSteps();
    if (stepResponse.code === 200) {
      stepResponse.data.forEach(step => {
        if (step.name === "Published") {
          publishedWorkflowStepId = step.id;
        }
        else if (step.name === "Draft") {
          draftWorkflowStepId = step.id;
        }
      });
    }
    else {
      return 'Failed to load workflow steps: ' + stepResponse.data;
    }
  }

  for (var k = 2; k <= rows; k++) {
    stopProcessing = false;
    // Init json result object for this row
    upsertResult = { "row": k, "name": "", updatedExisting: false, "errors": [], "results": [] };

    upsertRowData(sheet.getRange(k, 1, 1, cols).getValues(), headers, type, doUpdate, defaultLang);

    // Add result json object to sheet result object
    resultJSON.rows.push(upsertResult);
  }

  resultJSON.stats.type = type;
  resultJSON.stats.apiCounter = apiCounter; 
  resultJSON.stats.itemCounter = itemCounter;
  resultJSON.stats.variantCounter = variantCounter;
  resultJSON.stats.errorCounter = errorCounter;

  makeResultSheet(e);
}

const upsertRowData = (values, headers, type, doUpdate, defaultLang) => {
  const name = (nameColumn === -1) ? '' : values[0][nameColumn];
  const externalId = (externalIdColumn === -1) ? '' : values[0][externalIdColumn];
  let lang = (langColumn === -1) ? defaultLang : values[0][langColumn];
  if (lang === '' || lang === undefined) lang = defaultLang;

  // Make sure we have some way to identify the item
  if (name === '' && externalId === '') {
    errorCounter++;
    stopProcessing = true;
    upsertResult.errors.push(`Row doesn't contain a name or external_id`);
    return;
  }
  upsertResult.name = name;

  if (!doUpdate) {
    const newItem = createNewItem(type, name, externalId);

    upsertResult.results.push(`Created new item with ID ${newItem.id}`);
    upsertResult.updatedExisting = false;
    updateExistingItem(newItem, externalId, type, headers, values, true, lang);
  }
  else {
    let existingItem = getExistingItem(type, name, externalId);
    if (existingItem === undefined) {
      // No content item - create item, then variant
      existingItem = createNewItem(type, name, externalId);

      upsertResult.updatedExisting = false;
      upsertResult.results.push(`Created new item with ID ${existingItem.id}`);
      updateExistingItem(existingItem, externalId, type, headers, values, true, lang);
    }
    else {
      // Content item found
      upsertResult.updatedExisting = true;
      upsertResult.results.push(`Found existing item with ID ${existingItem.system.id}`);
      updateExistingItem(existingItem, externalId, type, headers, values, false, lang);
    }
  }
}

const updateExistingItem = (existingItem, externalId, typeCodeName, headers, values, isNew, lang) => {
  if (stopProcessing) {
    return;
  }

  // Response from CM endpoint stores ID in 'id' but Delivery stores it in 'system.id'
  const itemId = (existingItem.id === undefined) ? existingItem.system.id : existingItem.id;

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
          upsertResult.results.push(`Created new version of "${lang}" language variant`);
        }
        else {
          // Version failure
          errorCounter++;
          stopProcessing = true;
          upsertResult.errors.push(`Error creating new version: ${versionResponse.data}`);
          return;
        }
      }
      else if (workflowStep !== draftWorkflowStepId) {
        // Move to draft
        const workflowResponse = moveToDraft(itemId, lang);
        if (workflowResponse.code === 204) {
          // Workflow success - script continues to upsert variant
          upsertResult.results.push(`Moved language variant to Draft step`);
        }
        else {
          // Workflow failure
          errorCounter++;
          stopProcessing = true;
          upsertResult.errors.push(`Error moving to Draft step: ${workflowResponse.data}`);
          return;
        }
      }

    }
  }

  // Get elements of type
  let typeElements;
  const typeResponse = getType(typeCodeName);
  if (typeResponse.code === 200) {
    typeElements = getTypeElements(typeResponse.data);
  }
  else {
    // Content type failure
    stopProcessing = true;
    errorCounter++;
    upsertResult.errors.push(`Error getting elements for type ${typeCodeName}: ${typeResponse.data}`);
    return;
  }

  // Create JS object with only row data for headers that match type elements
  const elements = [];
  for (var i = 0; i < headers.length; i++) {
    // Scan elements for code name
    for (var k = 0; k < typeElements.length; k++) {
      if (typeElements[k].codename === headers[i]) {
        // Found matching element
        let value = values[0][i];

        // Element-specific fixes to ensure data is in correct format for upsert
        switch (typeElements[k].type) {
          case "url_slug":

            if (value.length > 0) {

              var mode = 'custom';
              if (value === '#autogenerate#') {

                // Revert to autogeneration
                mode = 'autogenerated';
              }

              elements.push({
                'element': {
                  'codename': typeElements[k].codename
                },
                'value': value,
                'mode': mode
              });
            }

            // We manually added this element+value instead of after the switch
            // (or, there was no value and it was skipped) so continue the foreach loop
            continue;
          case "number":

            // Get currency_format column value
            const currencyFormat = (currencyFormatColumn === -1) ? 'US' : values[0][currencyFormatColumn];
            // Convert number string like '1,000.50' or '1 000,50' to float
            value = tryParseNumber(value, currencyFormat);
            break;
          case "rich_text":

            // Parse special ## macros
            value = parseRichText(value);
            break;
          case "asset":
          case "modular_content":

            // Value should be in format "<identifier type>:<identifier>,<identifier type>:<identifier>"
            // Split into expected format value:[{ <identifier type>: <identifier> }, { <identifier type>: <identifier> }]
            let ar = value.split(",");
            value = [];
            for (var a = 0; a < ar.length; a++) {
              // Individual asset from list
              const record = ar[a].split(":");
              if (record.length === 2) {
                value.push({ [record[0]]: record[1] });
              }
            }
            break;
          case "date_time":

            value = tryFormatDateTime(typeElements[k].codename, value);
            break;
          case "multiple_choice":
          case "taxonomy":

            // Values should be comma-separated code names
            if (value.length > 0) {
              let ar = value.split(',');
              value = [];
              for (var v = 0; v < ar.length; v++) {

                // Ensure lowercase for codenames
                var codename = ar[v].trim().toLowerCase();
                value.push({
                  "codename": codename
                });
              }
            }
            break;
        }

        // Don't upsert empty values
        if (value.length === 0) continue;

        elements.push({
          'element': {
            'codename': typeElements[k].codename
          },
          'value': value
        });
        break;
      }
    }
  }

  if (stopProcessing) return;

  const variantResponse = updateVariant(elements, itemId, lang);
  if(variantResponse.code === 200 || variantResponse.code === 201) {
    // Variant success
    variantCounter++;
    upsertResult.results.push(`Updated "${lang}" language variant`);
  }
  else {
    // Variant failure
    errorCounter++;
    stopProcessing = true;
    if(response.data.validation_errors) {
      responseText = response.data.validation_errors[0].message;
    }
    else {
      responseText = response.data.message;
    }
    upsertResult.errors.push(`Error upserting language variant: ${responseText}`);
  }
}

/**
-----------------------------------------------
  JS functions
-----------------------------------------------
**/

// Format can be 'US' or 'EU'
const tryParseNumber = (number, format) => {

  number = number.toString().trim();
  switch (format) {
    case 'US':

      // At the moment, no processing seems to be needed
      // Strings like '1,000.50' are already accepted by Kontent
      break;
    case 'EU':

      // Remove inner spaces and dots
      number = number.replace(/\s/g, '').replace(/\./g, '');
      // Replace comma with decimal
      number = number.replace(/\,/g, '.');
      break;
  }

  return number;
}

// Currently doesn't work for dd/mm/yy
const tryFormatDateTime = (elementCodeName, dateTime) => {
  let date = new Date(dateTime);
  let ret = '';

  try {
    ret = date.toISOString();
  }
  catch (e) {
    // First failure, could be SQL time like 2017-01-10 15:46:54.5576119
    const t = dateTime.split(/[- :]/);
    date = new Date(Date.UTC(t[0], t[1] - 1, t[2], t[3], t[4], t[5]));

    try {
      ret = date.toISOString();
    }
    catch (e) {
      // Second failure, could be in format like 11-5-2019, try replace
      dateTime = dateTime.replace(/-/gi, '/');
      date = new Date(dateTime);
      try {
        ret = date.toISOString();
      }
      catch (ex) {
        errorCounter++;
        output.append(`<li>Error parsing date value of element "${elementCodeName}." Skipping element..</li>`);
      }
    }
  }

  return ret;
}

// @ts-ignore
String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
  function () {
    "use strict";
    let str = this.toString();
    if (arguments.length) {
      const t = typeof arguments[0];
      const args = ("string" === t || "number" === t) ?
        Array.prototype.slice.call(arguments)
        : arguments[0];

      let key;
      for (key in args) {
        str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
      }
    }

    return str;
  };