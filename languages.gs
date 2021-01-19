const LANGUAGES_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/languages';

const getDefaultLanguage = () => {
  const response = executeGetRequest(LANGUAGES_ENDPOINT);
  if(response.getResponseCode() === 200) {
    // Success
    const languages = JSON.parse(response.getContentText()).languages;
    const defaultLanguage = languages.filter(l => l.is_default);
    if(defaultLanguage.length > 0) {
      return {
        'code': response.getResponseCode(),
        'data': defaultLanguage[0]
      } 
    }
  }
  // Failure
  return {
    'code': response.getResponseCode(),
    'data': JSON.parse(response.getContentText().message)
  }
}