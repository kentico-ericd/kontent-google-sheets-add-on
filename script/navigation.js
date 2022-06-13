const showHomeCard = () => {
  // Nav buttons
  const settingsButton = CardService.newTextButton()
    .setText(CARD_SETTINGS)
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("navigateTo")
        .setParameters({ card: CARD_SETTINGS })
    );
  const generateButton = CardService.newTextButton()
    .setText(CARD_GENERATE)
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("navigateTo")
        .setParameters({ card: CARD_GENERATE })
    );
  const importButton = CardService.newTextButton()
    .setText(CARD_IMPORT)
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("navigateTo")
        .setParameters({ card: CARD_IMPORT })
    );
  const insertButton = CardService.newTextButton()
    .setText(CARD_INSERT)
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("navigateTo")
        .setParameters({ card: CARD_INSERT })
    );
  const validateButton = CardService.newTextButton()
    .setText(CARD_VALIDATE)
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("navigateTo")
        .setParameters({ card: CARD_VALIDATE })
    );
  const exportButton = CardService.newTextButton()
    .setText(CARD_EXPORT)
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("navigateTo")
        .setParameters({ card: CARD_EXPORT })
    );

  // Get connected project
  const keys = loadKeys();
  let projectInfo;
  if (keys.pid) {
    let response = getProjectInfo(keys.pid);
    if (response.code === 200) {
      projectInfo = CardService.newDecoratedText()
        .setTopLabel("Connected to project")
        .setText(`<b>${response.data.name}</b>`)
        .setBottomLabel(`Environment ${response.data.environment}`);
    } else {
      projectInfo = CardService.newTextParagraph().setText(
        `Cannot connect to project: "${response.data}"`
      );
    }
  } else {
    projectInfo = CardService.newTextParagraph().setText(
      "You are not connected to a project. Please visit the <b>Project settings</b> menu to set your API keys. If you recently updated your keys, please refresh the addon from the sidebar header."
    );
  }

  // Help button
  const fixedFooter = CardService.newFixedFooter().setPrimaryButton(
    CardService.newTextButton()
      .setText("Help")
      .setOnClickAction(
        CardService.newAction().setFunctionName("openUrl").setParameters({
          url: "https://github.com/Kentico/kontent-google-sheets-add-on#-google-sheets-import",
        })
      )
  );

  const homeCard = CardService.newCardBuilder()
    .addSection(CardService.newCardSection().addWidget(projectInfo))
    .addSection(
      CardService.newCardSection()
        .addWidget(importButton)
        .addWidget(
          CardService.newTextParagraph().setText(
            "Transfer rows from Sheets to Kontent"
          )
        )
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(exportButton)
        .addWidget(
          CardService.newTextParagraph().setText(
            "Transfer content items from Kontent to Sheets"
          )
        )
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(validateButton)
        .addWidget(
          CardService.newTextParagraph().setText(
            "Validate elements in the Sheet"
          )
        )
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(insertButton)
        .addWidget(
          CardService.newTextParagraph().setText(
            "Generate macros for rich text"
          )
        )
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(generateButton)
        .addWidget(
          CardService.newTextParagraph().setText(
            "Create a new Sheet from a content type"
          )
        )
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(settingsButton)
        .addWidget(
          CardService.newTextParagraph().setText("Set your project API keys")
        )
    )
    .setFixedFooter(fixedFooter)
    .build();

  return [homeCard];
};

const showImportProgress = (rowNum, totalRows) => {
  const card = CardService.newCardBuilder()
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText("Import partially completed:")
        )
        .addWidget(
          CardService.newTextParagraph().setText(
            `<b>${rowNum}/${totalRows}</b>`
          )
        )
        .addWidget(
          CardService.newTextParagraph().setText(
            "Please click the button below to resume importing the Sheet."
          )
        )
    )
    .setFixedFooter(
      CardService.newFixedFooter().setPrimaryButton(
        CardService.newTextButton()
          .setText("Resume")
          .setOnClickAction(
            CardService.newAction().setFunctionName("upsertChunk")
          )
      )
    )
    .build();
  const nav = CardService.newNavigation().pushCard(card);

  return CardService.newActionResponseBuilder().setNavigation(nav).build();
};

const showImportComplete = (logName) => {
  const card = CardService.newCardBuilder()
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText("<b>Import complete</b>")
        )
        .addWidget(
          CardService.newTextParagraph().setText(
            `Check the Sheet "${logName}" for a detailed log`
          )
        )
    )
    .setFixedFooter(
      CardService.newFixedFooter().setPrimaryButton(
        CardService.newTextButton()
          .setText("Home")
          .setOnClickAction(
            CardService.newAction().setFunctionName("navigateTo")
          )
      )
    )
    .build();
  const nav = CardService.newNavigation().pushCard(card);

  return CardService.newActionResponseBuilder().setNavigation(nav).build();
};

const navigateTo = (e = undefined) => {
  let nav;
  const cardName = e ? e.parameters.card : "";
  switch (cardName) {
    case CARD_GENERATE:
      nav = CardService.newNavigation().pushCard(makeGenerateCard(e));
      break;
    case CARD_IMPORT:
      nav = CardService.newNavigation().pushCard(makeImportCard());
      break;
    case CARD_EXPORT:
      nav = CardService.newNavigation().pushCard(makeExportCard());
      break;
    case CARD_SETTINGS:
      nav = CardService.newNavigation().pushCard(makeSettingsCard());
      break;
    case CARD_INSERT:
      nav = CardService.newNavigation().pushCard(makeInsertCard());
      break;
    case CARD_VALIDATE:
      nav = CardService.newNavigation().pushCard(makeValidateCard());
      break;
    default:
      nav = CardService.newNavigation().popToRoot();
  }

  return CardService.newActionResponseBuilder().setNavigation(nav).build();
};

const makeInsertCard = () => {
  // Generate item link
  const itemLinkSection = CardService.newCardSection().setHeader(
    "Generate content item link"
  );
  const itemLinkType = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.RADIO_BUTTON)
    .setTitle("Identifier type")
    .setFieldName(KEY_ITEMLINK_IDENTIFIERTYPE)
    .addItem("Item ID", VALUE_IDENTIFIERTYPE_ID, true)
    .addItem("External ID", VALUE_IDENTIFIERTYPE_EXTERNAL, false);
  const itemLinkIDInput = CardService.newTextInput()
    .setFieldName(KEY_ITEMLINK_IDENTIFIER)
    .setHint("Enter the content item ID or external ID");
  const itemLinkTextInput = CardService.newTextInput()
    .setFieldName(KEY_ITEMLINK_TEXT)
    .setHint("Link text");
  const itemLinkButton = CardService.newTextButton()
    .setText("Generate")
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("generateMacro")
        .setParameters({ macro: KEY_ITEMLINK_IDENTIFIER })
    );
  itemLinkSection.addWidget(itemLinkType);
  itemLinkSection.addWidget(itemLinkIDInput);
  itemLinkSection.addWidget(itemLinkTextInput);
  itemLinkSection.addWidget(itemLinkButton);

  // Generate component - get all content types for dropdown
  let componentSection;
  const contentTypesResponse = loadTypes();
  if (contentTypesResponse.code === 200) {
    componentSection =
      CardService.newCardSection().setHeader("Generate component");
    const componentType = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setTitle("Component type")
      .setFieldName(KEY_COMPONENT_IDENTIFIERTYPE);
    contentTypesResponse.data.forEach((type) => {
      componentType.addItem(type.name, type.codename, false);
    });
    const componentButton = CardService.newTextButton()
      .setText("Set values &gt;")
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName("populateComponent")
          .setParameters({ type: KEY_COMPONENT_IDENTIFIERTYPE })
      );

    componentSection.addWidget(componentType);
    componentSection.addWidget(componentButton);
  }

  // Generate inline item
  const inlineItemSection = CardService.newCardSection().setHeader(
    "Generate inline content item"
  );
  const inlineItemType = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.RADIO_BUTTON)
    .setTitle("Identifier type")
    .setFieldName(KEY_INLINEITEM_IDENTIFIERTYPE)
    .addItem("Item ID", VALUE_IDENTIFIERTYPE_ID, true)
    .addItem("External ID", VALUE_IDENTIFIERTYPE_EXTERNAL, false);
  const inlineItemInput = CardService.newTextInput()
    .setFieldName(KEY_INLINEITEM_IDENTIFIER)
    .setHint("Enter the content item ID or external ID");
  const inlineItemButton = CardService.newTextButton()
    .setText("Generate")
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("generateMacro")
        .setParameters({ macro: KEY_INLINEITEM_IDENTIFIER })
    );
  inlineItemSection.addWidget(inlineItemType);
  inlineItemSection.addWidget(inlineItemInput);
  inlineItemSection.addWidget(inlineItemButton);

  // Generate asset link
  const assetLinkSection = CardService.newCardSection().setHeader(
    "Generate asset link"
  );
  const assetLinkType = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.RADIO_BUTTON)
    .setTitle("Identifier type")
    .setFieldName(KEY_ASSETLINK_IDENTIFIERTYPE)
    .addItem("Asset ID", VALUE_IDENTIFIERTYPE_ID, true)
    .addItem("External ID", VALUE_IDENTIFIERTYPE_EXTERNAL, false);
  const assetLinkInput = CardService.newTextInput()
    .setFieldName(KEY_ASSETLINK_IDENTIFIER)
    .setHint("Enter the asset ID or external ID");
  const assetLinkTextInput = CardService.newTextInput()
    .setFieldName(KEY_ASSETLINK_TEXT)
    .setHint("Link text");
  const assetLinkButton = CardService.newTextButton()
    .setText("Generate")
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("generateMacro")
        .setParameters({ macro: KEY_ASSETLINK_IDENTIFIER })
    );
  assetLinkSection.addWidget(assetLinkType);
  assetLinkSection.addWidget(assetLinkInput);
  assetLinkSection.addWidget(assetLinkTextInput);
  assetLinkSection.addWidget(assetLinkButton);

  return CardService.newCardBuilder()
    .setName(CARD_INSERT)
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText(
          'Find the macro you want to generate, fill in the fields, and click "Generate." A new window will pop up with the macro to copy/paste into your Sheet!'
        )
      )
    )
    .addSection(itemLinkSection)
    .addSection(componentSection)
    .addSection(inlineItemSection)
    .addSection(assetLinkSection)
    .build();
};

const makeGenerateCard = () => {
  const section = CardService.newCardSection();
  if (allTypes.length === 0) {
    // Load all types into memory
    const response = loadTypes();
    if (response.code === 200) {
      allTypes = response.data;
      allTypes.sort(function (a, b) {
        var val1 = a.name.toUpperCase();
        var val2 = b.name.toUpperCase();
        if (val1 < val2) {
          return -1;
        }
        if (val1 > val2) {
          return 1;
        }

        return 0;
      });
    } else {
      // Failure
      showAlert(`Error retrieving content types: ${response.data}`);
      return;
    }
  }

  const dropDown = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle("Choose the content type to generate a Sheet for.")
    .setFieldName(KEY_SELECTED_TYPE);
  for (const type of allTypes) {
    dropDown.addItem(type.name, type.codename, false);
  }
  section.addWidget(dropDown);

  const fixedFooter = CardService.newFixedFooter()
    .setPrimaryButton(
      CardService.newTextButton()
        .setText("Generate")
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("makeSheetForType")
        )
    );

  return CardService.newCardBuilder()
    .setName(CARD_GENERATE)
    .setHeader(
      CardService.newCardHeader().setTitle(
        "Generate a new Sheet from a content type with the required headers."
      )
    )
    .addSection(section)
    .setFixedFooter(fixedFooter)
    .build();
};

const openUrl = (e) => {
  const url = e.parameters.url;
  return CardService.newActionResponseBuilder()
    .setOpenLink(
      CardService.newOpenLink()
        .setUrl(url)
        .setOpenAs(CardService.OpenAs.OVERLAY)
    )
    .build();
};

const showAlert = (message, title = "Message") => {
  let ui = SpreadsheetApp.getUi();
  ui.alert(title, message, ui.ButtonSet.OK);
};

const makeExportCard = () => {
  if (allTypes.length === 0) {
    // Load all types into memory
    const response = loadTypes();
    if (response.code === 200) {
      allTypes = response.data;
      allTypes.sort(function (a, b) {
        var val1 = a.name.toUpperCase();
        var val2 = b.name.toUpperCase();
        if (val1 < val2) {
          return -1;
        }
        if (val1 > val2) {
          return 1;
        }

        return 0;
      });
    } else {
      // Failure
      showAlert(`Error retrieving content types: ${response.data}`);
      return;
    }
  }

  const translateIdSwitch = CardService.newKeyValue()
    .setTopLabel("Translate IDs")
    .setContent(
      "The Management API always returns IDs, so elements like taxonomy will not be importable into projects where the IDs differ. Enable this option to translate IDs into codenames or external-ids, so references to objects can be imported between multiple projects where those identifiers match."
    )
    .setMultiline(true)
    .setSwitch(
      CardService.newSwitch()
        .setSelected(false)
        .setFieldName(KEY_TRANSLATEIDS)
        .setValue("false")
    );

  const dropDown = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle("Choose the content type to export.")
    .setFieldName(KEY_SELECTED_TYPE);
  for (const type of allTypes) {
    dropDown.addItem(type.name, type.codename, false);
  }

  const section = CardService.newCardSection()
    .addWidget(translateIdSwitch)
    .addWidget(dropDown);

    const fixedFooter = CardService.newFixedFooter()
    .setPrimaryButton(
      CardService.newTextButton()
        .setText("Export")
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("exportContentItems")
        )
    );

  return CardService.newCardBuilder()
    .setName(CARD_EXPORT)
    .setHeader(
      CardService.newCardHeader().setTitle(
        "Exports all language variants of the selected content type as rows of a new Sheet."
    ))
    .addSection(section)
    .setFixedFooter(fixedFooter)
    .build();
};

const makeValidateCard = () => {
  const section = CardService.newCardSection().addWidget(
    CardService.newTextParagraph().setText(
      "You can use this menu to validate Sheet cells before the import process runs, to avoid errors during import. Click the <b>Validate</b> button below, and all validated cells will change color to indicate their status. Invalid cells will contain a note suggesting potential resolution."
    )
  );

  const fixedFooter = CardService.newFixedFooter().setPrimaryButton(
    CardService.newTextButton()
      .setText("Validate")
      .setOnClickAction(
        CardService.newAction().setFunctionName("validateSheet")
      )
  );

  return CardService.newCardBuilder()
    .setName(CARD_VALIDATE)
    .addSection(section)
    .setFixedFooter(fixedFooter)
    .build();
};

const makeImportCard = () => {
  var updateSwitch = CardService.newKeyValue()
    .setTopLabel("Update existing items")
    .setContent(
      "If enabled, existing content items will be updated. If disabled, new items will always be created"
    )
    .setMultiline(true)
    .setSwitch(
      CardService.newSwitch()
        .setSelected(true)
        .setFieldName(KEY_DOUPDATE)
        .setValue("true")
    );
  var preloadSwitch = CardService.newKeyValue()
    .setTopLabel("Preload content items")
    .setContent(
      "If enabled, all content items will be cached at the start of the import. Depending on the size of the project, this can greatly improve performance and reduce the number of API calls."
    )
    .setMultiline(true)
    .setSwitch(
      CardService.newSwitch()
        .setSelected(true)
        .setFieldName(KEY_DOPRELOAD)
        .setValue("true")
    );

  const section = CardService.newCardSection()
    .addWidget(updateSwitch)
    .addWidget(preloadSwitch);

  const fixedFooter = CardService.newFixedFooter().setPrimaryButton(
    CardService.newTextButton()
      .setText("Run")
      .setOnClickAction(CardService.newAction().setFunctionName("doImport"))
  );

  return CardService.newCardBuilder()
    .setName(CARD_IMPORT)
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText(
          "Imports the currently active Sheet. Rows in the Sheet are imported as content items of the type specified by the Sheet name."
        )
      )
    )
    .addSection(section)
    .setFixedFooter(fixedFooter)
    .build();
};

const makeSettingsCard = () => {
  const keys = loadKeys();

  const fixedFooter = CardService.newFixedFooter()
    .setSecondaryButton(
      CardService.newTextButton()
        .setText("Clear")
        .setOnClickAction(
          CardService.newAction().setFunctionName("clearSettings")
        )
    )
    .setPrimaryButton(
      CardService.newTextButton()
        .setText("Save")
        .setOnClickAction(
          CardService.newAction().setFunctionName("saveSettings")
        )
    );

  const section = CardService.newCardSection()
    .addWidget(
      CardService.newTextInput()
        .setFieldName("pid")
        .setValue(keys.pid ? keys.pid : "")
        .setTitle("Project ID")
    )
    .addWidget(
      CardService.newTextInput()
        .setFieldName("cmkey")
        .setValue(keys.cmkey ? keys.cmkey : "")
        .setTitle("Management API key")
    )
    .addWidget(
      CardService.newTextInput()
        .setFieldName("previewkey")
        .setValue(keys.previewkey ? keys.previewkey : "")
        .setTitle("Preview API key")
    );

  return CardService.newCardBuilder()
    .setName(CARD_SETTINGS)
    .setHeader(CardService.newCardHeader().setTitle(CARD_SETTINGS))
    .addSection(section)
    .setFixedFooter(fixedFooter)
    .build();
};

const clearSettings = (e) => {
  PropertiesService.getUserProperties().deleteAllProperties();
  return CardService.newActionResponseBuilder()
    .setStateChanged(true)
    .setNavigation(CardService.newNavigation().popCard())
    .build();
};

const saveSettings = (e) => {
  const keys = e.commonEventObject.formInputs;
  PropertiesService.getUserProperties().setProperties({
    pid: keys.pid.stringInputs.value[0],
    cmkey: keys.cmkey.stringInputs.value[0],
    previewkey: keys.previewkey.stringInputs.value[0],
  });

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .setStateChanged(true)
    .setNotification(CardService.newNotification().setText("Keys saved"))
    .build();
};
