/**
 * Executes a request with implemented throttling.
 */
const execute = (url, options) => {
  apiCounter++;
  let response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() === 429) {
    // API limit exceeded, wait and retry
    let waitTime = response.getHeaders()["Retry-After"];
    // Time is in seconds, convert to ms
    waitTime *= 1000;
    waitTimes += waitTime;
    Utilities.sleep(waitTime);

    return execute(url, options);
  }

  return response;
};

/**
 * Executes a GET request against the passed MAPI endpoint after applying the ProjectID to the URL, then other passed parameters.
 * Automatically increments the apiCounter variable
 **/
const executeGetRequest = (endpoint, args) => {
  const keys = loadKeys();
  let url = endpoint.formatUnicorn({ project_id: keys.pid });
  if (args) url = url.formatUnicorn(args);
  const options = {
    method: "get",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + keys.cmkey,
    },
  };

  return execute(url, options);
};

/**
 * Executes a request with payload against the passed MAPI endpoint after applying the ProjectID to the URL, then other passed parameters.
 * Data passed to the function will automatically be stringified.
 * Automatically increments the apiCounter variable.
 **/
const executeRequest = (endpoint, method, data, args) => {
  const keys = loadKeys();
  let url = endpoint.formatUnicorn({ project_id: keys.pid });
  if (args) url = url.formatUnicorn(args);
  let options = {
    method: method,
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + keys.cmkey,
    },
  };
  if (data) {
    options["payload"] = JSON.stringify(data);
  }

  return execute(url, options);
};
