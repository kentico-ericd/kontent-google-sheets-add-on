// Endpoints
const PROJECT_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}';
const ITEMS_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items';
const ITEM_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/external-id/{external_id}';
const PREVIEW_ENDPOINT = 'https://preview-deliver.kontent.ai/{project_id}';
const VARIANT_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}';
const WORKFLOW_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/workflow';
const NEWVERSION_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/new-version';
const MOVEWORKFLOW_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/workflow/{workflow_step_identifier}';
const TYPES_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/types';
const TYPE_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/types/codename/{code_name}';
const SNIPPET_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/snippets/{snippet_identifier}';
const LANGUAGES_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/languages';

// Import variables
let defaultLang = "default";
let startTime;
let headers = [];
let apiCounter = 0, itemCounter = 0, variantCounter = 0, errorCounter = 0;
let stopProcessing = false;
let publishedWorkflowStepId, draftWorkflowStepId;
let langColumn = -1, nameColumn = -1, externalIdColumn = -1, currencyFormatColumn = -1;
let doUpdate = false, doPreload = false;

// JSON objects for import results: main object for storing all results, single object used in each row
let resultJSON = { rows: [], stats: {} }, upsertResult = {};

// Content item cache- ALL content items in project!
let contentItemCache = {};

// API keys
let mPID, mCMKEY, mPREVIEWKEY;

const loadKeys = () => {
  if(!mPID) {
    // Keys haven't been loaded yet
    mPID = PropertiesService.getUserProperties().getProperty('pid');
    mCMKEY = PropertiesService.getUserProperties().getProperty('cmkey');
    mPREVIEWKEY = PropertiesService.getUserProperties().getProperty('previewkey');
  }

  return { "pid": mPID, "cmkey": mCMKEY, "previewkey": mPREVIEWKEY };
}

const resetGlobals = () => {
  defaultLang = "default";
  startTime = new Date();
  headers = [];
  apiCounter = 0;
  itemCounter = 0;
  variantCounter = 0;
  errorCounter = 0;
  langColumn = -1;
  nameColumn = -1;
  externalIdColumn = -1;
  doUpdate = false;
  doPreload = false;
  currencyFormatColumn = -1;
  resultJSON = { rows: [], stats: {} };
  contentItemCache = {};
}