// Endpoints
const PREVIEW_ENDPOINT = 'https://preview-deliver.kontent.ai/{project_id}';
const TYPES_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/types';
const TYPE_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/types/codename/{code_name}';
const ITEMS_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items';
const ITEM_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/external-id/{external_id}';
const VARIANT_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}';
const WORKFLOW_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/workflow';
const NEWVERSION_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/new-version';
const MOVEWORKFLOW_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/workflow/{workflow_step_identifier}';
const SNIPPET_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/snippets/{snippet_identifier}';
const LANGUAGES_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/languages';

// Import variables
let output;
let apiCounter = 0, itemCounter = 0, variantCounter = 0, errorCounter = 0;
let stopProcessing = false;
let publishedWorkflowStepId, draftWorkflowStepId;
let langColumn = -1, nameColumn = -1, externalIdColumn = -1;

const include = (filename) => {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

const onInstall = (e) => {
  onOpen(e);
}

const onOpen = (e) => {
  SpreadsheetApp.getUi()
      .createMenu('Kentico Kontent')
      .addItem('⚙ Configure', 'showConfig')
      .addItem('📋 Generate', 'showGenerate')
      .addItem('☁ Import', 'showImport')
      .addToUi();
}

const showGenerate = () => {
  navigate('Generate'); 
}

const showImport = () => {
  navigate('Import'); 
}

const showConfig = () => {
  navigate('Keys');
}

const showAlert = (message) => {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
     'Error',
     message,
     ui.ButtonSet.OK);
}

const loadKeys = () => {
  const pid = PropertiesService.getUserProperties().getProperty('pid');
  const cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  const previewkey = PropertiesService.getUserProperties().getProperty('previewkey');
  return `${(pid || '')};${(cmkey || '')};${(previewkey || '')}`;
}

const storeKeys = (pid, cmkey, previewkey) => {
  PropertiesService.getUserProperties().setProperties({
    'pid': pid,
    'cmkey': cmkey,
    'previewkey': previewkey
  });
}

const navigate = (page) => {
  const html = HtmlService.createTemplateFromFile(page)
      .evaluate()
      .setWidth(500)
      .setTitle('Kentico Kontent');
  SpreadsheetApp.getUi()
      .showSidebar(html);
}

/**
-----------------------------------------------
  Sheet functions
-----------------------------------------------
**/

const makeSheet = (codename, typeJSON) => {
  const types = JSON.parse(typeJSON).data;

  // Check if sheet with code name already exists
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(codename);
  if (sheet != null) {
    showAlert('A sheet already exists with this content type code name.');
    return codename;
  }
  
  // Find type in JSON matching codename
  types.forEach(type => {
    if(type.codename === codename) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const newSheet = ss.insertSheet(codename);
      const elements = getTypeElements(type);
    
      // Generate headers
      const range = newSheet.getRange(1, 1, 1, elements.length + 2);
      range.getCell(1, 1).setValue("name");
      range.getCell(1, 2).setValue("external_id");
      for(var i=0; i<elements.length; i++) {
        range.getCell(1, i+3).setValue(elements[i].codename);
      }
      
      return codename;
    }
  });
}

/**
-----------------------------------------------
  Import functions
-----------------------------------------------
**/

const doImport = (doUpdate) => {
  apiCounter = 0;
  itemCounter = 0;
  variantCounter = 0;
  errorCounter = 0;
  langColumn = -1;
  nameColumn = -1;
  externalIdColumn = -1;
  
  const sheet = SpreadsheetApp.getActiveSheet();
  const cols = sheet.getLastColumn();
  const rows = sheet.getLastRow();
  const type = sheet.getName().toLowerCase();
  
  if(cols < 1) {
    return 'Your sheet doesn\'t contain enough data to import!';
  }
  
  const headerRow = sheet.getRange(1, 1, 1, cols).getValues();
  const headers = [];
  
  // Get all header values
  for(var i=0; i<cols; i++) {
    const value = headerRow[0][i].toString().toLowerCase();
    switch(value) {
      case "language":
        langColumn = i
        break;
      case "name":
        nameColumn = i
        break;
      case "external_id":
        externalIdColumn = i
        break;
    }
    headers.push(value);
  }
  
  // If no name column found, cancel
  if(nameColumn === -1) {
    return 'Your sheet needs to contain a "name" header';
  }
  
  // Get default lang of project or use the "default" language in new projects
  const langResponse = getDefaultLanguage();
  let defaultLang;
  if(langResponse.code === 200) {
    defaultLang = langResponse.data.codename;
  }
  else {
    defaultLang = 'default'; 
  }
  
  if(doUpdate) {
    // Get ID of Published/Draft workflow step for later use
    const stepResponse = getWorkflowSteps();
    if(stepResponse.code === 200) {
      stepResponse.data.forEach(step => {
        if(step.name === "Published") {
          publishedWorkflowStepId = step.id;
        }
        else if(step.name === "Draft") {
          draftWorkflowStepId = step.id;
        }             
      });
    }
    else {
      return 'Failed to load workflow steps: ' + stepResponse.data;
    }
  }
  
  output = HtmlService.createHtmlOutput('<h2>Log:</h2><ul>');
  
  for(var k=2; k<=rows; k++) {
    stopProcessing = false;
    upsertRowData(sheet.getRange(k, 1, 1, cols).getValues(), headers, type, doUpdate, k, defaultLang);
  }
  
  output.append('</ul>');
  output.append('<h2>Stats:</h2><ul>');
  output.append(`<li><b>${apiCounter}</b> API calls made.</li>`);
  output.append(`<li><b>${itemCounter}</b> new items created.</li>`);
  output.append(`<li><b>${variantCounter}</b> language variants updated.</li>`);
  output.append(`<li><b>${errorCounter}</b> total errors.</li>`);
  output.append('</ul>');
  
  return output.getContent();
}

const upsertRowData = (values, headers, type, doUpdate, rowNum, defaultLang) => {
  const name = (nameColumn === -1) ? '' : values[0][nameColumn];
  const externalId = (externalIdColumn === -1) ? '' : values[0][externalIdColumn];
  let lang = (langColumn === -1) ? defaultLang : values[0][langColumn];
  if(lang === '' || lang === undefined) lang = defaultLang;

  output.append(`<li>Importing row ${rowNum}`);
  output.append('<ul>');
  
  // Make sure we have some way to identify the item
  if(name === '' && externalId === '') {
    errorCounter++;
    stopProcessing = true;
    output.append(`<li>Row number ${rowNum} doesn't contain a name or external_id</li>`);
    return;
  }
  
  if(doUpdate === '0') {
    const newItem = createNewItem(type, name, externalId);
    updateExistingItem(newItem, externalId, type, headers, values, true, lang);
  }
  else {
    let existingItem = getExistingItem(type, name, externalId);
    if(existingItem === undefined) {
      // No content item - create item, then variant
      existingItem = createNewItem(type, name, externalId);
      updateExistingItem(existingItem, externalId, type, headers, values, true, lang);
    }
    else {
      // Content item found
      output.append('<li>Existing item found</li>');
      updateExistingItem(existingItem, externalId, type, headers, values, false, lang);
    }
  }
  
  output.append('</ul>');
  output.append('</li>');
}

const updateExistingItem = (existingItem, externalId, typeCodeName, headers, values, isNew, lang) => {
  if(stopProcessing) {
    return; 
  }
  
  // Response from CM endpoint stores ID in 'id' but Delivery stores it in 'system.id'
  const itemId = (existingItem.id === undefined) ? existingItem.system.id : existingItem.id;
  
  if(!isNew) {
    // Check workflow, create new version or move to Draft
    const variantResponse = getExistingVariant(itemId, externalId, lang);
    if(variantResponse.code === 200) {
      // Variant Success - check workflow step
      const workflowStep = variantResponse.data.workflow_step.id;
      if(workflowStep === publishedWorkflowStepId) {
         // Create new version 
        const versionResponse = createNewVersion(itemId, lang);
        if(versionResponse.code === 204) {
          // Version success - script continues to upsert variant
          output.append('<li>Created new version</li>');
        }
        else {
          // Version failure
          errorCounter++;
          stopProcessing = true;
          output.append(`<li>Error creating new version: ${versionResponse.data}</li>`);
          return;
        }
      }
      else if(workflowStep !== draftWorkflowStepId) {
         // Move to draft
        const workflowResponse = moveToDraft(itemId, lang);
        if(workflowResponse.code === 204) {
          // Workflow success - script continues to upsert variant
          output.append('<li>Moved to Draft step</li>');
        }
        else {
          // Workflow failure
          errorCounter++;
          stopProcessing = true;
          output.append(`<li>Error moving to Draft step: ${workflowResponse.data}</li>`);
          return;
        }
      }

    }
  }
  
  // Get elements of type
  let typeElements;
  const typeResponse = getType(typeCodeName); 
  if(typeResponse.code === 200) {
    typeElements = getTypeElements(typeResponse.data);
  }
  else {
    // Content type failure
    stopProcessing = true;
    errorCounter++;
    output.append(`<li>Error getting elements for type ${typeCodeName}: ${typeResponse.data}</li>`);
    return;
  }

  // Create JS object with only row data for headers that match type elements
  const elements = [];
  for(var i=1; i<headers.length; i++) {
    // Scan elements for code name
    for(var k=0; k<typeElements.length; k++) {
      if(typeElements[k].codename === headers[i]) {
        // Found matching element
        let value = values[0][i];
        
        // Element-specific fixes to ensure data is in correct format for upsert
        switch(typeElements[k].type) {
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
            for(var a=0; a<ar.length; a++) {
              // Individual asset from list
              const record = ar[a].split(":");
              if(record.length === 2) {
                value.push({[record[0]]:record[1]}); 
              }
            }
            break;
          case "date_time":
            
            value = tryFormatDateTime(typeElements[k].codename, value);
            break;
          case "multiple_choice":
          case "taxonomy":
            
            // Values should be comma-separated code names
            if(value.length > 0) {
              let ar = value.split(',');
              value = [];
              for(var v=0; v<ar.length; v++) {
                value.push({
                  "codename": ar[v].trim()
                });
              }
            }
            break;
        }
        
        // Don't upsert empty values
        if(value.length === 0) continue;
        
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
  
  if(stopProcessing) return;  
  
  updateVariant(elements, itemId, lang);
}

/**
-----------------------------------------------
  JS functions
-----------------------------------------------
**/

// Currently doesn't work for dd/mm/yy
const tryFormatDateTime = (elementCodeName, dateTime) => {
  let date = new Date(dateTime);
  let ret = '';
  
  try{
    ret = date.toISOString();
  }
  catch(e) {
    // First failure, could be SQL time like 2017-01-10 15:46:54.5576119
    const t = dateTime.split(/[- :]/);
    date = new Date(Date.UTC(t[0], t[1]-1, t[2], t[3], t[4], t[5]));
    
    try {
      ret = date.toISOString();
    }
    catch(e) {
      // Second failure, could be in format like 11-5-2019, try replace
      dateTime = dateTime.replace(/-/gi, '/');
      date = new Date(dateTime);
      try {
        ret = date.toISOString();
      }
      catch(ex) {
        errorCounter++;
        output.append(`<li>Error parsing date value of element "${elementCodeName}." Skipping element..</li>`);
      }
    }
  }
  
  return ret;
}

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