const getProjectInfo = (pid) => {
  const response = executeGetRequest(PROJECT_ENDPOINT, { project_id: pid });
  if (response.getResponseCode() === 200) {
    // Success
    return {
      code: 200,
      data: JSON.parse(response.getContentText()),
    };
  }
  // Failure
  return {
    code: response.getResponseCode(),
    data: JSON.parse(response.getContentText()).message,
  };
};
