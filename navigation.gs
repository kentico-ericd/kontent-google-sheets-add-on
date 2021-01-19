const CARD_SETTINGS = 'Project settings',
CARD_GENERATE = 'Generate sheet',
CARD_IMPORT = 'Import';

const showHomeCard = () => {
  // Nav buttons
  const settingsButton = CardService.newTextButton()
      .setText(CARD_SETTINGS)
      .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('navigateTo')
        .setParameters({ 'card': CARD_SETTINGS }));
  const generateButton = CardService.newTextButton()
      .setText(CARD_GENERATE)
      .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('navigateTo')
        .setParameters({ 'card': CARD_GENERATE }));
  const importButton = CardService.newTextButton()
      .setText(CARD_IMPORT)
      .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('navigateTo')
        .setParameters({ 'card': CARD_IMPORT }));

  // Get connected project
  const keys = loadKeys();
  let projectInfo;
  if(keys.pid) {
    let response = getProjectInfo(keys.pid);
    if(response.code === 200) {
      projectInfo = CardService.newDecoratedText()
        .setTopLabel('Connected to project')
        .setText(`<b>${response.data.name}</b>`)
        .setBottomLabel(`Environment ${response.data.environment}`);
    }
    else {
      projectInfo = CardService.newTextParagraph()
        .setText(`Cannot connect to project: "${response.data}"`);
    }
  }
  else {
    projectInfo = CardService.newTextParagraph()
      .setText('You are not connected to a project. Please visit the <b>Project settings</b> menu to set your API keys. If you recently updated your keys, please refresh the addon from the sidebar header.');
  }
  
  // Help button
  const fixedFooter = CardService.newFixedFooter()
    .setPrimaryButton(CardService.newTextButton()
      .setText("Help")
      .setOnClickAction(CardService.newAction()
        .setFunctionName('openUrl')
        .setParameters({ 'url': 'https://github.com/Kentico/kontent-google-sheets-add-on#usage' })));

  const homeCard = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(projectInfo)
      .addWidget(importButton)
      .addWidget(generateButton)
      .addWidget(settingsButton))
    .setFixedFooter(fixedFooter)
    .build();
    
  return [homeCard];
}

const navigateTo = (e) => {
  let nav;
  const cardName = e.parameters.card;
  switch(cardName) {
    case CARD_GENERATE:
      nav = CardService.newNavigation().pushCard(makeGenerateCard());
      break;
    case CARD_IMPORT:
      nav = CardService.newNavigation().pushCard(makeImportCard());
      break;
    case CARD_SETTINGS:
      nav = CardService.newNavigation().pushCard(makeSettingsCard());
      break;
  }

  return CardService.newActionResponseBuilder()
    .setNavigation(nav)
    .build();
}

const makeGenerateCard = () => {
  const section = CardService.newCardSection();
  const response = loadTypes();

  if(response.code === 200) {
    response.data.forEach(type => {
      section.addWidget(
        CardService.newTextButton().setText(type.name)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('makeSheet')
          .setParameters({ 'json': JSON.stringify(type) })));
    });
  }
  else {
    section.addWidget(CardService.newTextParagraph().setText(response.data));
  }

  const fixedFooter = CardService.newFixedFooter()
    .setPrimaryButton(CardService.newTextButton()
            .setText("Help")
            .setOnClickAction(CardService.newAction()
              .setFunctionName('openUrl')
              .setParameters({ 'url': 'https://github.com/Kentico/kontent-google-sheets-add-on#preparing-the-sheet' })));

  return CardService.newCardBuilder()
    .setName(CARD_GENERATE)
    .setHeader(CardService.newCardHeader()
      .setTitle('Generate a new Sheet from a content type with the required headers.'))
    .addSection(section)
    .setFixedFooter(fixedFooter)
    .build();
}

const openUrl = (e) => {
  const url = e.parameters.url;
  return CardService.newActionResponseBuilder()
    .setOpenLink(CardService.newOpenLink().setUrl(url).setOpenAs(CardService.OpenAs.OVERLAY))
    .build(); 
}

const makeImportCard = () => {
  var updateSwitch = CardService.newKeyValue()
    .setTopLabel("Update existing items")
    .setContent("If enabled, existing content items will be updated. If disabled, new items will always be created")
    .setMultiline(true)
    .setSwitch(CardService.newSwitch()
      .setSelected(true)
      .setFieldName('doupdate_key')
      .setValue('true'));

  const section = CardService.newCardSection()
    .addWidget(updateSwitch);

  const fixedFooter = CardService.newFixedFooter()
    .setPrimaryButton(CardService.newTextButton()
      .setText("Run")
      .setOnClickAction(CardService.newAction().setFunctionName('doImport')));

  return CardService.newCardBuilder()
    .setName(CARD_IMPORT)
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('Imports the currently active Sheet. Rows in the Sheet are imported as content items of the type specified by the Sheet name.')))
    .addSection(section)
    .setFixedFooter(fixedFooter)
    .setDisplayStyle(CardService.DisplayStyle.PEEK)
    .build();
}

const makeSettingsCard = () => {
  const keys = loadKeys();

  const fixedFooter = CardService.newFixedFooter()
    .setSecondaryButton(CardService.newTextButton()
            .setText("Clear")
            .setOnClickAction(CardService.newAction().setFunctionName('clearSettings')))
    .setPrimaryButton(CardService.newTextButton()
            .setText("Save")
            .setOnClickAction(CardService.newAction().setFunctionName('saveSettings')));

  const section = CardService.newCardSection()
    .addWidget(CardService.newTextInput()
      .setFieldName("pid")
      .setValue(keys.pid ? keys.pid : "")
      .setTitle("Project ID"))
    .addWidget(CardService.newTextInput()
      .setFieldName("cmkey")
      .setValue(keys.cmkey ? keys.cmkey : "")
      .setTitle("Management API key"))
    .addWidget(CardService.newTextInput()
      .setFieldName("previewkey")
      .setValue(keys.previewkey ? keys.previewkey : "")
      .setTitle("Preview API key"));

  return CardService.newCardBuilder()
    .setName(CARD_SETTINGS)
    .setHeader(CardService.newCardHeader().setTitle(CARD_SETTINGS))
    .addSection(section)
    .setFixedFooter(fixedFooter)
    .build();
}

const clearSettings = (e) => {
  PropertiesService.getUserProperties().deleteAllProperties();
  return CardService.newActionResponseBuilder()
    .setStateChanged(true)
    .setNavigation(CardService.newNavigation().popCard())
    .build(); 
}

const saveSettings = (e) => {
  const keys = e.commonEventObject.formInputs;
  PropertiesService.getUserProperties().setProperties({
    'pid': keys.pid.stringInputs.value[0],
    'cmkey': keys.cmkey.stringInputs.value[0],
    'previewkey': keys.previewkey.stringInputs.value[0]
  });

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .setStateChanged(true)
    .setNotification(CardService.newNotification().setText("Keys saved"))
    .build();
}