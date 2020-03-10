// Endpoints
var PREVIEW_ENDPOINT = 'https://preview-deliver.kontent.ai/{project_id}';
var TYPES_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/types';
var TYPE_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/types/codename/{code_name}';
var ITEMS_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items';
var ITEM_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/external-id/{external_id}';
var VARIANT_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}';
var WORKFLOW_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/workflow';
var NEWVERSION_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/new-version';
var MOVEWORKFLOW_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/workflow/{workflow_step_identifier}';

// Import variables
var output;
var apiCounter = 0, itemCounter = 0, variantCounter = 0, errorCounter = 0;
var stopProcessing = false;
var publishedWorkflowStepId, draftWorkflowStepId;
var langColumn = -1, nameColumn = -1, externalIdColumn = -1;

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function onInstall(e) {
  onOpen(e);
}

function onOpen(e) {
  SpreadsheetApp.getUi()
      .createMenu('Kentico Kontent')
      .addItem('⚙ Configure', 'showConfig')
      .addItem('📋 Generate', 'showGenerate')
      .addItem('☁ Import', 'showImport')
      .addToUi();
}

function showGenerate() {
  navigate('Generate'); 
}

function showImport() {
  navigate('Import'); 
}

function showConfig() {
  navigate('Keys');
}

function showAlert(message) {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
     'Error',
     message,
     ui.ButtonSet.OK);
}

function loadKeys() {
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  var previewkey = PropertiesService.getUserProperties().getProperty('previewkey');
  return (pid || '') + ';' + (cmkey || '') + ';' + (previewkey || '');
}

function storeKeys(pid, cmkey, previewkey) {
  PropertiesService.getUserProperties().setProperties({
    'pid': pid,
    'cmkey': cmkey,
    'previewkey': previewkey
  });
}

function navigate(page) {
  var html = HtmlService.createTemplateFromFile(page)
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

function makeSheet(codename, typeJSON) {
  var types = JSON.parse(typeJSON).data;

  // Check if sheet with code name already exists
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(codename);
  if (sheet != null) {
    showAlert('A sheet already exists with this content type code name.');
    return codename;
  }
  
  // Find type in JSON matching codename
  for(var i=0; i<types.length; i++) {
    var t = types[i];
    if(t.codename === codename) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var newSheet = ss.insertSheet(codename);
      
      // Remove guideline elements
      var elementsFiltered = [];
      for(var e=0; e<t.elements.length; e++) {
        if(t.elements[e].type !== "guidelines") elementsFiltered.push(t.elements[e]);
      }
      
      // Generate headers
      var range = newSheet.getRange(1, 1, 1, elementsFiltered.length + 2);
      range.getCell(1, 1).setValue("name");
      range.getCell(1, 2).setValue("external_id");
      for(var i=0; i<elementsFiltered.length; i++) {
        range.getCell(1, i+3).setValue(elementsFiltered[i].codename);
      }
      
      return codename;
    }
  }
}

/**
-----------------------------------------------
  Find existing item by name or external_id
-----------------------------------------------
**/

function findById(externalId) {
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  var url = ITEM_ENDPOINT.formatUnicorn({
    project_id: pid,
    external_id: externalId
  });
  var options = {
    'method': 'get',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  apiCounter++;
  var response = UrlFetchApp.fetch(url, options);
  if(response.getResponseCode() === 200) {
    // Success
    return JSON.parse(response.getContentText())
  }
}

function findByName(name, type) {
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var previewkey = PropertiesService.getUserProperties().getProperty('previewkey');
  var url = PREVIEW_ENDPOINT.formatUnicorn({project_id: pid}) +'/items?system.name=' + name + '&system.type=' + type;

  var options = {
    'method': 'get',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + previewkey
    }
  };
  apiCounter++;
  var response = UrlFetchApp.fetch(url, options);
  if(response.getResponseCode() === 200) {
    var json = JSON.parse(response.getContentText());
    if(json.items.length > 0) return json.items[0];
  }
}

function getExistingItem(type, name, externalId) {
  if(externalId !== '') return findById(externalId);
  else return findByName(name, type);
}

/**
-----------------------------------------------
  Find existing variant by name or external_id
-----------------------------------------------
**/

function getExistingVariant(itemId, externalId, lang) {
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  
  var identifier;
  if(externalId !== '') {
    identifier = 'external-id/' + externalId;
  }
  else {
    identifier = itemId;  
  }
  
  var url = VARIANT_ENDPOINT.formatUnicorn({
    project_id: pid,
    item_identifier: identifier,
    language_codename: lang
  });
  
  var options = {
    'method': 'get',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  apiCounter++;
  var response = UrlFetchApp.fetch(url, options);
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

/**
-----------------------------------------------
  Other CM functions
-----------------------------------------------
**/

function getWorkflowSteps() {
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  var url = WORKFLOW_ENDPOINT.formatUnicorn({project_id: pid});
  var options = {
    'method': 'get',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  apiCounter++;
  var response = UrlFetchApp.fetch(url, options);
  if(response.getResponseCode() === 200) {
    // Success
    return {
      'code': 200,
      'data': JSON.parse(response.getContentText())
    }
  }
  else {
    // Failure
    return {
      'code': response.getResponseCode(),
      'data': JSON.parse(response.getContentText().message)
    }
  }
}

function getType(codename) {
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  var url = TYPE_ENDPOINT.formatUnicorn({project_id: pid, code_name: codename});
  var options = {
    'method': 'get',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  apiCounter++;
  var response = UrlFetchApp.fetch(url, options);
  if(response.getResponseCode() === 200) {
    // Success
    return {
      'code': 200,
      'data': JSON.parse(response.getContentText())
    };
  }
  // Failure
  return {
    'code': response.getResponseCode(),
    'data': JSON.parse(response.getContentText()).message
  };
}

function loadTypes() {
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  var url = TYPES_ENDPOINT.formatUnicorn({project_id: pid});
  var options = {
    'method': 'get',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  var response = UrlFetchApp.fetch(url, options);
  if(response.getResponseCode() === 200) {
    // Success
    return JSON.stringify({
      'code': 200,
      'data': JSON.parse(response.getContentText()).types
    });
  }
  // Failure
  return JSON.stringify({
    'code': response.getResponseCode(),
    'data': JSON.parse(response.getContentText()).message
  });
}

function moveToDraft(itemId, lang) {
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  var url = MOVEWORKFLOW_ENDPOINT.formatUnicorn({
    project_id: pid,
    item_identifier:  itemId,
    language_codename: lang,
    workflow_step_identifier: draftWorkflowStepId
  });
  var options = {
    'method': 'put',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  apiCounter++;
  var response = UrlFetchApp.fetch(url, options);
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

/**
-----------------------------------------------
  Import functions
-----------------------------------------------
**/

function doImport(doUpdate) {
  apiCounter = 0;
  itemCounter = 0;
  variantCounter = 0;
  errorCounter = 0;
  langColumn = -1;
  nameColumn = -1;
  externalIdColumn = -1;
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var cols = sheet.getLastColumn();
  var rows = sheet.getLastRow();
  var type = sheet.getName().toLowerCase();
  
  if(cols < 1) {
    return 'Your sheet doesn\'t contain enough data to import!';
  }
  
  var headerRow = sheet.getRange(1, 1, 1, cols).getValues();
  var headers = [];
  
  // Get all header values
  for(var i=0; i<cols; i++) {
    var value = headerRow[0][i].toString().toLowerCase();
    if(value === "language") {
      langColumn = i;
    }
    if(value === "name") {
      nameColumn = i;
    }
    if(value === "external_id") {
      externalIdColumn = i;
    }
    headers.push(value);
  }
  // If no name column found, cancel
  if(nameColumn === -1) {
    return 'Your sheet needs to contain a "name" header';
  }
  
  if(doUpdate) {
    // Get ID of Published/Draft workflow step for later use
    var response = getWorkflowSteps();
    if(response.code === 200) {
      for(var i=0; i<response.data.length; i++) {
        if(response.data[i].name === "Published") {
          publishedWorkflowStepId = response.data[i].id;
        }
        else if(response.data[i].name === "Draft") {
          draftWorkflowStepId = response.data[i].id;
        }
      }
    }
    else {
      return 'Failed to load workflow steps: ' + response.data;
    }
  }
  
  output = HtmlService.createHtmlOutput('<h2>Log:</h2><ul>');
  
  for(var k=2; k<=rows; k++) {
    stopProcessing = false;
    upsertRowData(sheet.getRange(k, 1, 1, cols).getValues(), headers, type, doUpdate, k);
  }
  
  output.append('</ul>');
  output.append('<h2>Stats:</h2><ul>');
  output.append('<li><b>' + apiCounter + '</b> API calls made.</li>');
  output.append('<li><b>' + itemCounter + '</b> new items created.</li>');
  output.append('<li><b>' + variantCounter + '</b> language variants updated.</li>');
  output.append('<li><b>' + errorCounter + '</b> total errors.</li>');
  output.append('</ul>');
  
  return output.getContent();
}

function upsertRowData(values, headers, type, doUpdate, rowNum) {
  var name = (nameColumn === -1) ? '' : values[0][nameColumn];
  var lang = (langColumn === -1) ? 'en-US' : values[0][langColumn];
  var externalId = (externalIdColumn === -1) ? '' : values[0][externalIdColumn];
  if(lang === '' || lang === undefined) lang = 'en-US';

  
  output.append('<li>Importing row ' + rowNum);
  output.append('<ul>');
  
  // Make sure we have some way to identify the item
  if(name === '' && externalId === '') {
    errorCounter++;
    stopProcessing = true;
    output.append('<li>Row number ' + rowNum + ' doesn\'t contain a name or external_id</li>');
    return;
  }
  
  if(doUpdate === '0') {
    var newItem = createNewItem(type, name, externalId);
    updateExistingItem(newItem, externalId, type, headers, values, true, lang);
  }
  else {
    var existingItem = getExistingItem(type, name, externalId);
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

/**
-----------------------------------------------
  Creating and updating functions
  Use stopProcessing to cease functions for this row and continue to next
-----------------------------------------------
**/

function createNewVersion(itemId, lang) {
  if(stopProcessing) {
    return; 
  }
  
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  var url = NEWVERSION_ENDPOINT.formatUnicorn({
    project_id: pid,
    item_identifier:  itemId,
    language_codename: lang
  });
  var options = {
    'method': 'put',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  apiCounter++;
  var response = UrlFetchApp.fetch(url, options);
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

function updateExistingItem(existingItem, externalId, typeCodeName, headers, values, isNew, lang) {
  if(stopProcessing) {
    return; 
  }
  
  // Response from CM endpoint stores ID in 'id' but Delivery stores it in 'system.id'
  var itemId = (existingItem.id === undefined) ? existingItem.system.id : existingItem.id;
  
  if(!isNew) {
    // Check workflow, create new version or move to Draft
    var variantResponse = getExistingVariant(itemId, externalId, lang);
    if(variantResponse.code === 200) {
      // Variant Success - check workflow step
      var workflowStep = variantResponse.data.workflow_step.id;
      if(workflowStep === publishedWorkflowStepId) {
         // Create new version 
        var versionResponse = createNewVersion(itemId, lang);
        if(versionResponse.code === 204) {
          // Version success - script continues to upsert variant
          output.append('<li>Created new version</li>');
        }
        else {
          // Version failure
          errorCounter++;
          stopProcessing = true;
          output.append('<li>Error creating new version: ' + versionResponse.data + '</li>');
          return;
        }
      }
      else if(workflowStep !== draftWorkflowStepId) {
         // Move to draft
        var workflowResponse = moveToDraft(itemId, lang);
        if(workflowResponse.code === 204) {
          // Workflow success - script continues to upsert variant
          output.append('<li>Moved to Draft step</li>');
        }
        else {
          // Workflow failure
          errorCounter++;
          stopProcessing = true;
          output.append('<li>Error moving to Draft step: ' + workflowResponse.data + '</li>');
          return;
        }
      }

    }
    else {
      // Variant failure
      // We used to stopProcessing here, but failing to find a variant isn't actually a problem- we can just continue and upsert one anyways
      /*errorCounter++;
      stopProcessing = true;
      output.append('<li>Error getting existing variant: ' + response.data + '</li>');
      return;*/
    }
  }
  
  // Get elements of type
  var typeElements;
  var response = getType(typeCodeName); 
  if(response.code === 200) {
    for(var i=0; i<response.data.elements.length; i++) {
      typeElements = response.data.elements;
    }
  }
  else {
    // Content type failure
    stopProcessing = true;
    errorCounter++;
    output.append('<li>Error getting elements for type ' + typeCodeName + ': ' + response.data + '</li>');
    return;
  }

  // Create JS object with only row data for headers that match type elements
  var elements = [];
  for(var i=1; i<headers.length; i++) {
    // Scan elements for code name
    for(var k=0; k<typeElements.length; k++) {
      if(typeElements[k].codename === headers[i]) {
        // Found matching element
        var value = values[0][i];
        
        // Element-specific fixes to ensure data is in correct format for upsert
        switch(typeElements[k].type) {
          case "asset":
            
            // Value should be in format "<identifier type>:<identifier>,<identifier type>:<identifier>"
            // Split into expected format value:[{ <identifier type>: <identifier> }, { <identifier type>: <identifier> }]
            var ar = value.split(",");
            value = [];
            for(var a=0; a<ar.length; a++) {
              // Individual asset from list
              var asset = ar[a].split(":");
              if(asset.length === 2) {
                value.push({[asset[0]]:asset[1]}); 
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
              var ar = value.split(',');
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
  
  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  var url = VARIANT_ENDPOINT.formatUnicorn({
    project_id: pid,
    item_identifier: itemId,
    language_codename: lang
  });
  
  var options = {
    'method': 'put',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'payload': JSON.stringify({
      'elements': elements
    }),
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  apiCounter++;
  var response = UrlFetchApp.fetch(url, options);
  if(response.getResponseCode() === 200 || response.getResponseCode() === 201) {
    // Variant success
    variantCounter++;
    output.append('<li>Variant updated</li>');
  }
  else {
    // Variant failure
    errorCounter++;
    stopProcessing = true;
    var rsp = JSON.parse(response.getContentText());
    if(rsp.validation_errors) {
      rsp = rsp.validation_errors[0].message;
    }
    else {
      rsp = rsp.message;
    }
    output.append('<li>Error upserting language variant: ' + rsp + '</li>');
  }
}

function createNewItem(type, name, externalId) {
  if(stopProcessing) {
    return; 
  }
  
  var data;
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

  var pid = PropertiesService.getUserProperties().getProperty('pid');
  var cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  var url = ITEMS_ENDPOINT.formatUnicorn({project_id: pid});
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'payload': JSON.stringify(data),
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  apiCounter++;
  var response = UrlFetchApp.fetch(url, options);
  if(response.getResponseCode() === 201) {
    // Content item success
    itemCounter++;
    var item = JSON.parse(response.getContentText());
    output.append('<li>Created new content item, ID ' + item.id + '</li>');
    return item;
  }
  else {
    // Content item failure
    errorCounter++;
    stopProcessing = true;
    var rsp = JSON.parse(response.getContentText());
    if(rsp.validation_errors) {
      rsp = rsp.validation_errors[0].message;
    }
    else {
      rsp = rsp.message;
    }
    output.append('<li>Error creating content item: ' + rsp + '</li>');
  }
}

/**
-----------------------------------------------
  JS functions
-----------------------------------------------
**/

// Currently doesn't work for dd/mm/yy
function tryFormatDateTime(elementCodeName, dateTime) {
  var date = new Date(dateTime);
  var ret = '';
  
  try{
    ret = date.toISOString();
  }
  catch(e) {
    // First failure, could be SQL time like 2017-01-10 15:46:54.5576119
    var t = dateTime.split(/[- :]/);
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
        output.append('<li>Error parsing date value of element "' + elementCodeName + '." Skipping element..</li>');
      }
    }
  }
  
  return ret;
}

String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
function () {
    "use strict";
    var str = this.toString();
    if (arguments.length) {
        var t = typeof arguments[0];
        var key;
        var args = ("string" === t || "number" === t) ?
            Array.prototype.slice.call(arguments)
            : arguments[0];

        for (key in args) {
            str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
        }
    }

    return str;
};