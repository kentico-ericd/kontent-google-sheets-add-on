/**
** Executes a GET request against the passed MAPI endpoint after applying the ProjectID to the URL, then other passed parameters.
** Automatically increments the apiCounter variable
**/
const executeGetRequest = (endpoint, args) => {
  const keys = loadKeys();
  let url = endpoint.formatUnicorn({project_id: keys.pid});
  if(args) url = url.formatUnicorn(args);
  const options = {
    'method': 'get',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + keys.cmkey
    }
  }

  apiCounter++;
  return UrlFetchApp.fetch(url, options);
}

/**
** Executes a request with payload against the passed MAPI endpoint after applying the ProjectID to the URL, then other passed parameters.
** Data passed to the function will automatically be stringified.
** Automatically increments the apiCounter variable.
**/
const executeRequest = (endpoint, method, data, args) => {
  const keys = loadKeys();
  let url = endpoint.formatUnicorn({project_id: keys.pid});
  if(args) url = url.formatUnicorn(args);
  let options = {
    'method': method,
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': 'Bearer ' + keys.cmkey
    }
  };
  if(data) {
    options['payload'] = JSON.stringify(data);
  }
  
  apiCounter++;
  return UrlFetchApp.fetch(url, options);
}