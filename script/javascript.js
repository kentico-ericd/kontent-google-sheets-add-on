const isTimeUp = () => {
  var now = new Date();
  return now.getTime() - startTime.getTime() > 30000;
};

// Format can be 'US' or 'EU'
const tryParseNumber = (number, format) => {
  number = number.toString().trim();
  switch (format) {
    case "US":
      // At the moment, no processing seems to be needed
      // Strings like '1,000.50' are already accepted by Kontent
      break;
    case "EU":
      // Remove inner spaces and dots
      number = number.replace(/\s/g, "").replace(/\./g, "");
      // Replace comma with decimal
      number = number.replace(/\,/g, ".");
      break;
  }

  return number;
};

var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
const generateGUID = () => {
  var d0 = Math.random()*0xffffffff|0;
  var d1 = Math.random()*0xffffffff|0;
  var d2 = Math.random()*0xffffffff|0;
  var d3 = Math.random()*0xffffffff|0;
  return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
  lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
  lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
  lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
}

// Currently doesn't work for dd/mm/yy
const tryFormatDateTime = (elementCodeName, dateTime) => {
  let date = new Date(dateTime);
  let ret = "";

  try {
    ret = date.toISOString();
  } catch (e) {
    // First failure, could be SQL time like 2017-01-10 15:46:54.5576119
    const t = dateTime.split(/[- :]/);
    date = new Date(Date.UTC(t[0], t[1] - 1, t[2], t[3], t[4], t[5]));

    try {
      ret = date.toISOString();
    } catch (e) {
      // Second failure, could be in format like 11-5-2019, try replace
      dateTime = dateTime.replace(/-/gi, "/");
      date = new Date(dateTime);
      try {
        ret = date.toISOString();
      } catch (ex) {
        errorCounter++;
        upsertResult.errors.push(
          `Error parsing date value of element "${elementCodeName}." Skipping element..`
        );
      }
    }
  }

  return ret;
};

// @ts-ignore
String.prototype.formatUnicorn =
  String.prototype.formatUnicorn ||
  function () {
    "use strict";
    let str = this.toString();
    if (arguments.length) {
      const t = typeof arguments[0];
      const args =
        "string" === t || "number" === t
          ? Array.prototype.slice.call(arguments)
          : arguments[0];

      let key;
      for (key in args) {
        str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
      }
    }

    return str;
  };
