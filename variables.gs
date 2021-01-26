// Endpoints
const PROJECT_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}';
const ITEMS_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items';
const ITEM_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/external-id/{external_id}';
const ITEM_ID_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{id}';
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
let typeElements = [];
let typeID = '';
let values = [];
let importingRowNum = 1;
let typeCodename = '';
let defaultLang = "default";
let startTime;
let headers = [];
let apiCounter = 0, itemCounter = 0, variantCounter = 0, errorCounter = 0, waitTimes = 0;
let stopProcessing = false;
let publishedWorkflowStepId, draftWorkflowStepId;
let langColumn = -1, nameColumn = -1, externalIdColumn = -1, currencyFormatColumn = -1, codenameColumn = -1;
let doUpdate = false, doPreload = false;

// JSON objects for import results: main object for storing all results, single object used in each row
let resultJSON = { rows: [], stats: {} }, upsertResult = {};

// Content item cache- ALL content items in project!
let contentItemCache = {};

// API keys
let mPID, mCMKEY, mPREVIEWKEY;

// Caching
const CACHE_VALUES_KEY = 'CACHE_VALUES',
CACHE_ROW_KEY = 'CACHE_ROW',
CACHE_CONTENTITEMS_KEY = 'CACHE_CONTENTITEMS',
CACHE_RESULTS_KEY = 'CACHE_RESULTS',
CACHE_CODENAME_KEY = 'CACHE_CODENAME',
CACHE_DOUPDATE_KEY = 'CACHE_DOUPDATE',
CACHE_DOPRELOAD_KEY = 'CACHE_DOPRELOAD',
CACHE_DEFAULTLANG_KEY = 'CACHE_DEFAULTLANG',
CACHE_PUBLISHSTEP_KEY = 'CACHE_PUBLISHSTEP',
CACHE_DRAFTSTEP_KEY = 'CACHE_DRAFTSTEP',
CACHE_APICOUNTER_KEY = 'CACHE_APICOUNTER',
CACHE_ITEMCOUNTER_KEY = 'CACHE_ITEMCOUNTER',
CACHE_VARIANTCOUNTER_KEY = 'CACHE_VARIANTCOUNTER',
CACHE_ERRORCOUNTER_KEY = 'CACHE_ERRORCOUNTER',
CACHE_WAITTIMES_KEY = 'CACHE_WAITTIMES',
CACHE_TYPEID_KEY = 'CACHE_TYPEID',
CACHE_TYPEELEMENTS_KEY = 'CACHE_TYPEELEMENTS';
const keyList = [CACHE_VALUES_KEY, CACHE_ROW_KEY, CACHE_CONTENTITEMS_KEY, CACHE_RESULTS_KEY, CACHE_CODENAME_KEY, CACHE_DOUPDATE_KEY, CACHE_DOPRELOAD_KEY, CACHE_DEFAULTLANG_KEY, CACHE_PUBLISHSTEP_KEY, CACHE_DRAFTSTEP_KEY, CACHE_APICOUNTER_KEY, CACHE_ITEMCOUNTER_KEY, CACHE_VARIANTCOUNTER_KEY, CACHE_ERRORCOUNTER_KEY, CACHE_WAITTIMES_KEY, CACHE_TYPEID_KEY, CACHE_TYPEELEMENTS_KEY];

const cacheData = () => {
  const data = {};

  data[CACHE_ROW_KEY] = importingRowNum.toString();
  data[CACHE_RESULTS_KEY] = JSON.stringify(resultJSON);
  data[CACHE_CODENAME_KEY] =  typeCodename;
  data[CACHE_DOUPDATE_KEY] = doUpdate.toString();
  data[CACHE_DOPRELOAD_KEY] = doPreload.toString();
  data[CACHE_DEFAULTLANG_KEY] = defaultLang;
  data[CACHE_PUBLISHSTEP_KEY] = publishedWorkflowStepId;
  data[CACHE_DRAFTSTEP_KEY] = draftWorkflowStepId;
  data[CACHE_APICOUNTER_KEY] = apiCounter.toString();
  data[CACHE_ITEMCOUNTER_KEY] = itemCounter.toString();
  data[CACHE_VARIANTCOUNTER_KEY] = variantCounter.toString();
  data[CACHE_ERRORCOUNTER_KEY] = errorCounter.toString();
  data[CACHE_WAITTIMES_KEY] = waitTimes.toString();
  data[CACHE_VALUES_KEY] = JSON.stringify(values);
  data[CACHE_CONTENTITEMS_KEY] = JSON.stringify(contentItemCache);
  data[CACHE_TYPEID_KEY] = typeID;
  data[CACHE_TYPEELEMENTS_KEY] = JSON.stringify(typeElements);

  CacheService.getUserCache().putAll(data);
}

const loadCache = () => {
  const cache = CacheService.getUserCache().getAll(keyList);
  
  values = JSON.parse(cache[CACHE_VALUES_KEY]);
  importingRowNum = parseInt(cache[CACHE_ROW_KEY]);
  contentItemCache = JSON.parse(cache[CACHE_CONTENTITEMS_KEY]);
  resultJSON = JSON.parse(cache[CACHE_RESULTS_KEY]);
  typeCodename = cache[CACHE_CODENAME_KEY];
  doUpdate = cache[CACHE_DOUPDATE_KEY] === 'true';
  doPreload = cache[CACHE_DOPRELOAD_KEY] === 'true';
  defaultLang = cache[CACHE_DEFAULTLANG_KEY];
  publishedWorkflowStepId = cache[CACHE_PUBLISHSTEP_KEY];
  draftWorkflowStepId = cache[CACHE_DRAFTSTEP_KEY];
  apiCounter = parseInt(cache[CACHE_APICOUNTER_KEY]);
  itemCounter = parseInt(cache[CACHE_ITEMCOUNTER_KEY]);
  variantCounter = parseInt(cache[CACHE_VARIANTCOUNTER_KEY]);
  errorCounter = parseInt(cache[CACHE_ERRORCOUNTER_KEY]);
  waitTimes = parseInt(cache[CACHE_WAITTIMES_KEY]);
  typeID = cache[CACHE_TYPEID_KEY];
  typeElements = JSON.parse(cache[CACHE_TYPEELEMENTS_KEY]);
}

const clearCache = () => {
  CacheService.getUserCache().removeAll(keyList);
}

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
  values = [];
  importingRowNum = 1;
  typeCodename = "";
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
  waitTimes = 0;
}