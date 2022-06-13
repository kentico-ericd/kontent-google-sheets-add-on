// Endpoints
const PROJECT_ENDPOINT = "https://manage.kontent.ai/v2/projects/{project_id}";
const ITEMS_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/items";
const ITEM_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/items/external-id/{external_id}";
const ITEM_BYCODENAME_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/items/codename/{codename}";
const ITEM_ID_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/items/{id}";
const PREVIEW_ENDPOINT = "https://preview-deliver.kontent.ai/{project_id}";
const VARIANT_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}";
const VARIANTSBYTYPE_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/types/codename/{type_codename}/variants";
const WORKFLOW_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/workflow";
const NEWVERSION_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/new-version";
const MOVEWORKFLOW_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/workflow/{workflow_step_identifier}";
const TYPES_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/types";
const TYPE_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/types/codename/{code_name}";
const SNIPPET_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/snippets/{snippet_identifier}";
const LANGUAGES_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/languages";
const TAXONOMY_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/taxonomies";
const ASSET_ENDPOINT =
  "https://manage.kontent.ai/v2/projects/{project_id}/assets";

// Macros
const COMPONENT = '<object type="application/kenticocloud" data-type="component" data-id="{identifier}"></object>';
const LINK_TO_CONTENT_ITEM =
  '<a data-item-{identifier_type}="{identifier}">{text}</a>';
const LINK_TO_ASSET =
  '<a data-asset-{identifier_type}="{identifier}">{text}</a>';
const CONTENT_ITEM_LINK =
  '<object type="application/kenticocloud" data-type="item" data-{identifier_type}="{identifier}"></object>';
const MACRO_REGEX = /##(.*?)##/g;
const TAG_REGEX =
  /<object[^>]+\b(data-type\s*=\s*['"]([^'"]+)['"][^>]*data-id\s*=\s*['"]([^'"]+)['"][^>]*)>/gm;
const CONVERTERS = [
  ["component", COMPONENT],
  ["link-item", LINK_TO_CONTENT_ITEM],
  ["link-asset", LINK_TO_ASSET],
  ["item", CONTENT_ITEM_LINK],
];
const MACRO_TEMPLATE_COMPONENT = "##component:id:{identifier}##",
  MACRO_TEMPLATE_ITEMLINK =
    "##link-item:{identifier_type}:{identifier}:{text}##",
  MACRO_TEMPLATE_INLINEITEM = "##item:{identifier_type}:{identifier}##",
  MACRO_TEMPLATE_ASSETLINK =
    "##link-asset:{identifier_type}:{identifier}:{text}##";

// Navigation
const CARD_SETTINGS = "Project settings",
  CARD_GENERATE = "Generate sheet",
  CARD_IMPORT = "Import",
  CARD_EXPORT = "Export",
  CARD_INSERT = "Rich text macros",
  CARD_VALIDATE = "Validate sheet";
const KEY_DOUPDATE = "doupdate_key",
  KEY_DOPRELOAD = "dopreload_key",
  KEY_TRANSLATEIDS = "dotranslate_key",
  KEY_INLINEITEM_IDENTIFIERTYPE = "inlineitem_identifiertype_key",
  KEY_INLINEITEM_IDENTIFIER = "inlineitem_identifier_key",
  KEY_ITEMLINK_IDENTIFIER = "itemlink_identifier_key",
  KEY_ITEMLINK_IDENTIFIERTYPE = "itemlink_identifiertype_key",
  KEY_ITEMLINK_TEXT = "itemlink_text_key",
  KEY_ASSETLINK_IDENTIFIER = "assetlink_identifier_key",
  KEY_ASSETLINK_IDENTIFIERTYPE = "assetlink_identifiertype_key",
  KEY_ASSETLINK_TEXT = "assetlink_text_key",
  KEY_COMPONENT_IDENTIFIERTYPE = "component_identifiertype_key",
  KEY_SELECTED_TYPE = "selected_content_type";
const VALUE_IDENTIFIERTYPE_ID = "id",
  VALUE_IDENTIFIERTYPE_EXTERNAL = "external_id";

let typeElements = [];
let typeID = "";
let values = [];
let importingRowNum = 1;
let typeCodename = "";
let defaultLang = "default";
let startTime;
let headers = [];
let apiCounter = 0,
  itemCounter = 0,
  variantCounter = 0,
  errorCounter = 0,
  waitTimes = 0;
let stopProcessing = false;
let publishedWorkflowStepId, draftWorkflowStepId;
let langColumn = -1,
  nameColumn = -1,
  externalIdColumn = -1,
  currencyFormatColumn = -1,
  codenameColumn = -1,
  componentColumn = -1;
let doUpdate = false,
  doPreload = false,
  doTranslateIDs = false;

// In process cache for export functionality and translating IDs to codename/external-id
let taxonomyCache = null,
  assetCache = null,
  choiceCache = null,
  modularCache = null;

// JSON objects for import results: main object for storing all results, single object used in each row
let resultJSON = [],
  upsertResult = {};
let resultSheetName = "";

// Content item cache- ALL content items in project!
let contentItemCache = [];

// Content type cache for Generate/Export card
let allTypes = [];

// API keys
let mPID, mCMKEY, mPREVIEWKEY;

// Caching
const CACHE_ROW_KEY = "CACHE_ROW",
  CACHE_DOUPDATE_KEY = "CACHE_DOUPDATE",
  CACHE_DOPRELOAD_KEY = "CACHE_DOPRELOAD",
  CACHE_DEFAULTLANG_KEY = "CACHE_DEFAULTLANG",
  CACHE_PUBLISHSTEP_KEY = "CACHE_PUBLISHSTEP",
  CACHE_DRAFTSTEP_KEY = "CACHE_DRAFTSTEP",
  CACHE_APICOUNTER_KEY = "CACHE_APICOUNTER",
  CACHE_ITEMCOUNTER_KEY = "CACHE_ITEMCOUNTER",
  CACHE_VARIANTCOUNTER_KEY = "CACHE_VARIANTCOUNTER",
  CACHE_ERRORCOUNTER_KEY = "CACHE_ERRORCOUNTER",
  CACHE_WAITTIMES_KEY = "CACHE_WAITTIMES",
  CACHE_TYPEID_KEY = "CACHE_TYPEID",
  CACHE_TYPEELEMENTS_KEY = "CACHE_TYPEELEMENTS",
  CACHE_RESULTSHEET_KEY = "CACHE_RESULTSHEET";
const keyList = [
  CACHE_ROW_KEY,
  CACHE_DOUPDATE_KEY,
  CACHE_DOPRELOAD_KEY,
  CACHE_DEFAULTLANG_KEY,
  CACHE_PUBLISHSTEP_KEY,
  CACHE_DRAFTSTEP_KEY,
  CACHE_APICOUNTER_KEY,
  CACHE_ITEMCOUNTER_KEY,
  CACHE_VARIANTCOUNTER_KEY,
  CACHE_ERRORCOUNTER_KEY,
  CACHE_WAITTIMES_KEY,
  CACHE_TYPEID_KEY,
  CACHE_TYPEELEMENTS_KEY,
  CACHE_RESULTSHEET_KEY,
];

const cacheData = () => {
  const data = {};

  data[CACHE_ROW_KEY] = importingRowNum.toString();
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
  data[CACHE_TYPEID_KEY] = typeID;
  data[CACHE_TYPEELEMENTS_KEY] = JSON.stringify(typeElements);
  data[CACHE_RESULTSHEET_KEY] = resultSheetName;

  CacheService.getUserCache().putAll(data);
};

const loadCache = () => {
  const cache = CacheService.getUserCache().getAll(keyList);

  importingRowNum = parseInt(cache[CACHE_ROW_KEY]);
  doUpdate = cache[CACHE_DOUPDATE_KEY] === "true";
  doPreload = cache[CACHE_DOPRELOAD_KEY] === "true";
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
  resultSheetName = cache[CACHE_RESULTSHEET_KEY];
};

const clearCache = () => {
  CacheService.getUserCache().removeAll(keyList);
};

const loadKeys = () => {
  if (!mPID) {
    // Keys haven't been loaded yet
    mPID = PropertiesService.getUserProperties().getProperty("pid");
    mCMKEY = PropertiesService.getUserProperties().getProperty("cmkey");
    mPREVIEWKEY =
      PropertiesService.getUserProperties().getProperty("previewkey");
  }

  return { pid: mPID, cmkey: mCMKEY, previewkey: mPREVIEWKEY };
};
