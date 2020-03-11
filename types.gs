const getType = (codename) => {
  const response = executeGetRequest(TYPE_ENDPOINT, {code_name: codename});
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


const loadTypes = () => {
  const response = executeGetRequest(TYPES_ENDPOINT);
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

const getSnippetElements = (id) => {
  const response = executeGetRequest(SNIPPET_ENDPOINT, {snippet_identifier: id});
  if(response.getResponseCode() === 200) {
    // Success
    return {
      'code': 200,
      'data': JSON.parse(response.getContentText()).elements
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

/**
** Gets type elements and expands on snippet elements to include in the resulting array
**/
const getTypeElements = (type) => {
  const elements = [];
  type.elements.forEach(e => {
        switch(e.type) {
          case "snippet":
            const response = getSnippetElements(e.snippet.id);
            if(response.code === 200) {
              let snippetElements = response.data;
              // Remove guidelines
              snippetElements = snippetElements.filter(s => s.type !== "guidelines");
              Array.prototype.push.apply(elements, snippetElements);
            }
            break;
          case "guidelines": break; // Don't add guidelines
          default:
            elements.push(e);
          break;
        }
  });
  return elements;
}