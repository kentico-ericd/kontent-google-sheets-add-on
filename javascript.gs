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
        upsertResult.errors.push(`Error parsing date value of element "${elementCodeName}." Skipping element..`);
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