const getDefaultLanguage = () => {
  const langResponse = getAllLanguages();
  if (langResponse.code === 200) {
    const defaultLanguage = langResponse.data.filter((l) => l.is_default);
    if (defaultLanguage.length > 0) {
      return {
        code: 200,
        data: defaultLanguage[0],
      };
    }
  }
  return langResponse;
};

const getAllLanguages = () => {
  const response = executeGetRequest(LANGUAGES_ENDPOINT);
  if (response.getResponseCode() === 200) {
    // Success
    const languages = JSON.parse(response.getContentText()).languages;
    return {
      code: response.getResponseCode(),
      data: languages,
    };
  }
  // Failure
  return {
    code: response.getResponseCode(),
    data: JSON.parse(response.getContentText()).message,
  };
};
