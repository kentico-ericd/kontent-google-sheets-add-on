/**
 * Replaces all instances of custom ##macros## with their Kontent counterpart and returns the full text
 */
const parseRichText = (text) => {
  // A single index in this array will look like ["##macro##","macro"]
  const matches = [...text.matchAll(MACRO_REGEX)];
  matches.forEach((match) => {
    const resolved = convertMacro(match[0], match[1]);
    if (resolved) {
      text = text.replace(match[0], resolved);
    } else {
      // convertMacro returned null
      stopProcessing = true;
      errorCounter++;
      upsertResult.errors.push(
        `Error resolving macro ${match[0]}. Skipping row...`
      );
    }
  });
  return text;
};

const convertMacro = (fullMacro, innerText) => {
  // innerText should look like "link-item:id:5946ca5d-cebe-4be1-b5f0-4cd0a0e43fb5:coffee is good"
  const parts = innerText.split(":");
  if (parts.length >= 3) {
    const macroType = parts[0].trim();
    const idType = parts[1].trim();
    const id = parts[2].trim();
    // Find converter that matches parts[0]
    let converter = CONVERTERS.filter((c) => c[0] === macroType);
    if (converter.length > 0) {
      converter = converter[0];
      let result = converter[1];
      // Replace parts of HTML with parts of innerText
      result = result.formatUnicorn({
        identifier_type: idType,
        identifier: id,
      });
      if (parts.length === 4) {
        // HTML also contains {text} placeholder
        result = result.formatUnicorn({ text: parts[3].trim() });
      }
      return result;
    } else {
      // Couldn't find matching converter
      return null;
    }
  }
};

/**
 * Called from navigation > macro menu to generate component macro
 */
const populateComponent = (e) => {
  const formInput = e.commonEventObject.formInputs;
  const typeCodename =
    formInput[KEY_COMPONENT_IDENTIFIERTYPE].stringInputs.value[0];
  const typeResponse = getType(typeCodename);

  if (typeResponse.code === 200) {
    const section = CardService.newCardSection().addWidget(
      CardService.newTextParagraph().setText(
        'Set the component values, then click "Generate" to copy the macro and component JSON into your Sheet.'
      )
    );
    const elements = getTypeElements(typeResponse.data);
    elements.forEach((element) => {
      let inputHint = `<font color='#bbbbbb'>${
        element.name ? element.name : element.codename
      } (${element.type})</font>`;
      if (element.is_required)
        inputHint = `<font color='#ff725c'>*</font> ${inputHint}`;
      const hint = CardService.newTextParagraph().setText(inputHint);
      const input = CardService.newTextInput().setFieldName(element.codename);
      if (element.type === "rich_text") input.setMultiline(true);

      section.addWidget(input).addWidget(hint);
    });

    const fixedFooter = CardService.newFixedFooter().setPrimaryButton(
      CardService.newTextButton()
        .setText("Generate")
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("generateComponent")
            .setParameters({
              elements: JSON.stringify(elements),
              typeID: typeResponse.data.id,
            })
        )
    );

    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().pushCard(
          CardService.newCardBuilder()
            .addSection(section)
            .setFixedFooter(fixedFooter)
            .build()
        )
      )
      .build();
  } else {
    // Failed to get type
  }
};

const generateMacro = (e) => {
  const macro = e.parameters.macro;
  const formInput = e.commonEventObject.formInputs;
  let identifier, identifierType, output;

  switch (macro) {
    case KEY_INLINEITEM_IDENTIFIER:
      identifier = formInput[KEY_INLINEITEM_IDENTIFIER].stringInputs.value[0];
      identifierType =
        formInput[KEY_INLINEITEM_IDENTIFIERTYPE].stringInputs.value[0];
      output = MACRO_TEMPLATE_INLINEITEM.formatUnicorn({
        identifier_type: identifierType,
        identifier: identifier,
      });
      break;
    case KEY_ITEMLINK_IDENTIFIER: {
      identifier = formInput[KEY_ITEMLINK_IDENTIFIER].stringInputs.value[0];
      identifierType =
        formInput[KEY_ITEMLINK_IDENTIFIERTYPE].stringInputs.value[0];
      const linkText = formInput[KEY_ITEMLINK_TEXT].stringInputs.value[0];
      output = MACRO_TEMPLATE_ITEMLINK.formatUnicorn({
        identifier_type: identifierType,
        identifier: identifier,
        text: linkText,
      });
      break;
    }
    case KEY_ASSETLINK_IDENTIFIER: {
      identifier = formInput[KEY_ASSETLINK_IDENTIFIER].stringInputs.value[0];
      identifierType =
        formInput[KEY_ASSETLINK_IDENTIFIERTYPE].stringInputs.value[0];
      const assetText = formInput[KEY_ASSETLINK_TEXT].stringInputs.value[0];
      output = MACRO_TEMPLATE_ASSETLINK.formatUnicorn({
        identifier_type: identifierType,
        identifier: identifier,
        text: assetText,
      });
      break;
    }
  }

  if (output) {
    return showMacro(output);
  }
};

const generateComponent = (e) => {
  const id = generateGUID();
  const typeID = e.parameters.typeID;
  const elements = JSON.parse(e.parameters.elements);
  const formInputs = e.commonEventObject.formInputs;
  const json = {
    id: id,
    type: {
      id: typeID,
    },
    elements: [],
  };

  elements.forEach((element) => {
    let value = "";
    const formInput = formInputs[element.codename];
    if (formInput) {
      value = formInput.stringInputs.value[0];
    }

    const parsedValue = getValueForUpsert(
      value,
      element.type,
      element.codename,
      "US"
    );
    if (parsedValue) json.elements.push(parsedValue);
  });

  const macro = MACRO_TEMPLATE_COMPONENT.formatUnicorn({
    identifier: id,
  });
  return showMacro(macro, true, json);
};

const showMacro = (macro, isComponent = false, componentJSON = null) => {
  const section = CardService.newCardSection()
    .addWidget(
      CardService.newTextParagraph().setText("We've generated a macro for you!")
    )
    .addWidget(CardService.newTextInput().setFieldName("xxx").setValue(macro));
  if (isComponent) {
    section
      .addWidget(
        CardService.newTextParagraph().setText(
          "Below is the JSON you need to add to rich_text_components"
        )
      )
      .addWidget(
        CardService.newTextInput()
          .setFieldName("yyy")
          .setValue(JSON.stringify(componentJSON))
      );
  }
  section.addWidget(
    CardService.newTextParagraph().setText(
      'Copy and paste it into your Sheet, then hit the "Back" arrow to generate more.'
    )
  );
  return CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation().pushCard(
        CardService.newCardBuilder().addSection(section).build()
      )
    )
    .build();
};
