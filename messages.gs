const MESSAGE_KEY_FORMAT = `USERSEEN_{id}`,
  MESSAGES = [
    {
      id: 'UPDATE_EXPORT_BETA',
      title: 'New update!',
      text: 'The new Export feature has just been added, which allows you to export content items from Kontent into Sheets. Please see https://github.com/Kentico/kontent-google-sheets-add-on#exporting-items-from-kontent for more information.\n\nAs the feature has just released, it should be considered in beta. Please do not use the feature in production environments without testing first!'
    },
    {
      id: 'UPDATE_EXPORT_FORMATCHANGE',
      title: 'Changes to taxonomy/multichoice',
      text: 'As a result of the recent update, the format of taxonomy and multiple choice elements has changed. Previously, you could list the codenames in a comma-separated format, but they now follow the same rules as assets and linked items.\n\nThe format is now a comma-separated list of reference objects: "<identifier type>:<identifier>." Please see https://github.com/Kentico/kontent-google-sheets-add-on#formatting-cell-values for details.'
    }
  ];

const checkMessages = () => {
  const cache = CacheService.getUserCache();
  for (const msg of MESSAGES) {
    const key = MESSAGE_KEY_FORMAT.formatUnicorn({ id: msg.id });
    if (!cache.get(key)) {
      showAlert(msg.text, msg.title);
      cache.put(key, 'true');
    }
  }
}