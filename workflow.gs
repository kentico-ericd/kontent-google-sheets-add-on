const WORKFLOW_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/workflow';
const NEWVERSION_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/new-version';
const MOVEWORKFLOW_ENDPOINT = 'https://manage.kontent.ai/v2/projects/{project_id}/items/{item_identifier}/variants/codename/{language_codename}/workflow/{workflow_step_identifier}';

const getWorkflowSteps = () => {
  const response = executeGetRequest(WORKFLOW_ENDPOINT);
  if(response.getResponseCode() === 200) {
    // Success
    return {
      'code': 200,
      'data': JSON.parse(response.getContentText())
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

const moveToDraft = (itemId, lang) => {
  const response = executeRequest(MOVEWORKFLOW_ENDPOINT, 'put', null, {item_identifier:  itemId, language_codename: lang, workflow_step_identifier: draftWorkflowStepId});
  if(response.getResponseCode() === 204) {
    // Success
    return {
      'code': 204
    };
  }
  // Failure
  return {
    'code': response.getResponseCode(),
    'data': JSON.parse(response.getContentText()).message
  };
}