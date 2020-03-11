/**
** Executes a GET request against the passed endpoint after applying the ProjectID to the URL, then other passed parameters.
** Automatically increments the apiCounter variable
**/
const executeGetRequest = (endpoint, args) => {
  const pid = PropertiesService.getUserProperties().getProperty('pid');
  const cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  let url = endpoint.formatUnicorn({project_id: pid});
  if(args) url = url.formatUnicorn(args);
  const options = {
    'method': 'get',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };

  apiCounter++;
  return UrlFetchApp.fetch(url, options);
}

/**
** Executes a request with payload against the passed endpoint after applying the ProjectID to the URL, then other passed parameters.
** Data passed to the function will automatically be stringified.
** Automatically increments the apiCounter variable.
**/
const executeRequest = (endpoint, method, data, args) => {
  const pid = PropertiesService.getUserProperties().getProperty('pid');
  const cmkey = PropertiesService.getUserProperties().getProperty('cmkey');
  let url = endpoint.formatUnicorn({project_id: pid});
  if(args) url = url.formatUnicorn(args);
  let options = {
    'method': method,
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + cmkey
    }
  };
  if(data) {
    options['payload'] = JSON.stringify(data);
  }
          
  apiCounter++;
  return UrlFetchApp.fetch(url, options);
}