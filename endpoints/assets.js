const getAllAssets = () => {
  let allAssets = [];
  let response = executeGetRequest(ASSET_ENDPOINT);
  if (response.getResponseCode() === 200) {
    let json = JSON.parse(response.getContentText());
    allAssets.push(...json.assets);

    // Check if there are more items to get
    while (json.pagination.continuation_token) {
      const token = json.pagination.continuation_token;
      const url = json.pagination.next_page;
      const options = {
        method: "get",
        contentType: "application/json",
        muteHttpExceptions: true,
        headers: {
          Authorization: "Bearer " + keys.cmkey,
          "x-continuation": token,
        },
      };

      response = execute(url, options);
      if (response.getResponseCode() === 200) {
        // Add items to list and continue loop
        json = JSON.parse(response.getContentText());
        allAssets.push(...json.assets);
      } else {
        errorCounter++;
        return {
          code: response.getResponseCode(),
          data: response.getContentText(),
        };
      }
    }
  } else {
    errorCounter++;
    return {
      code: response.getResponseCode(),
      data: response.getContentText(),
    };
  }

  // Finished loop without error, return all items
  return {
    code: 200,
    data: allAssets,
  };
};
