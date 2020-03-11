[![Stack Overflow](https://img.shields.io/badge/Stack%20Overflow-ASK%20NOW-FE7A16.svg?logo=stackoverflow&logoColor=white)](https://stackoverflow.com/tags/kentico-kontent)

# ![Sheets](https://www.google.com/images/about/sheets-icon.svg) Google Sheets Import

# Installation
Install from the G-Suite Marketplace [here](https://gsuite.google.com/marketplace/app/kentico_kontent/482429381322). Once installed, a new _Kentico Kontent_ menu will appear in the _Add-ons_ menu in Google Sheets:

![Menu](https://assets-us-01.kc-usercontent.com/4e9bdd7a-2db8-4c33-a13a-0c368ec2f108/d7fc0c90-dfe4-4685-98fe-1f983a58f7c8/sheets-addon-menu.png)

After installing, locate the following keys in http://app.kontent.ai and add them to the add-on's _Configure_ menu:

- Project ID
- Preview API key
- Management API key

# Usage
A supplemental Kontent blog post containing usage details and examples can be found [here](https://kontent.ai/blog/migrating-content-from-spreadsheets).

## Preparing the Sheet
You may create a new Sheet or edit an existing one. The _Generate_ menu of the add-on can also generate a new Sheet for you, along with the required headers, based on the project's content types.

If you have a local spreadsheet file, you can open it in Google Sheets by uploading it to Google Drive, then selecting _Open with > Google Sheets_.

![Open in Sheets](https://assets-us-01.kc-usercontent.com/4e9bdd7a-2db8-4c33-a13a-0c368ec2f108/cb91a697-53dd-41ae-a34d-826eac738ac7/sheets-addon-openwith.png)

Once the file is open in Sheets, you must re-save it as a Google Sheet file:

![Save as Sheet](https://assets-us-01.kc-usercontent.com/4e9bdd7a-2db8-4c33-a13a-0c368ec2f108/b93f6f94-4711-4c9c-94b0-ec3997140d49/sheets-addon-saveas.png)

Ensure that the __name__ of the Sheet matches the code name of the content type in your project which will be used to create items.

## Setting the headers

The headers (first row) of your Sheet must contain the code names of the content type's elements. If you use the _Generate_ menu of the add-on, these headers will be automatically generated. If adding headers manually, you can find the code names of the elements when editing the content type in https://app.kontent.ai.

![Code names](https://assets-us-01.kc-usercontent.com/4e9bdd7a-2db8-4c33-a13a-0c368ec2f108/9ba8baff-41c0-4d04-b536-52b24e25c99d/sheets-addon-type.png)

In addition to the element code names, the header row should also contain 3 other headers:

- __name__ (required): The name of the content item to create or update.
- __external_id__ (optional): The [external](https://docs.kontent.ai/reference/management-api-v2#section/External-IDs-for-imported-content) ID of the content item to update (overrides name header).
- __language__ (optional): The language of the variant to update. This should match the code name of a language in the project’s Localization page, and is case sensitive. If a language is not provided, the add-on will get the project's default language using Management API.

The following is an example of what a Sheet named __product__ might look like:

 | external_id | sku | name | price |	date_offered |
 | ----------- | --- | ---- | ----- | ------------ |
 | F4891FB5-5215-4795-8A6F-18A4F68394FD |	CO-ETH-YIRGACHEFFE |	Ethiopia Yirgacheffe (decaf) | 3.5 | 2017-01-10 15:46:54.5576119 |
 | DD84A64C-F0BE-42AA-9F47-228ED6520D27 |	CO-ETH-YIRGACHEFFE-5-lb |	Ethiopia Yirgacheffe (decaf) (5 lb) | 52 | 2017-01-10 16:02:44.6796146 |
 | 031A9DE2-51F4-41F7-B2FE-5825FBAADD6C |	CO-ETH-YIRGACHEFFE-4-oz |	Ethiopia Yirgacheffe (decaf) (4 oz) | 3.5 | 2017-01-10 16:02:44.6186085 |
 | FE991A97-3998-4FA0-9DF7-59A00622297B |	CO-ETH-YIRGACHEFFE-16-oz | Ethiopia Yirgacheffe (decaf) (16 oz) | 12 | 2017-01-10 16:02:44.5085975 |
 
## Formatting Cell Values
To avoid errors in importing data, the data in each column must be formatted according to the element it will be stored in. Most elements (such as Text and Number) are straight-forward, but some require specific formatting:

- __Date & Time__: The script will first try to parse the value using the JavaScript [Date(string) constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date), so any valid DateTime string will succeed. A typical valid string would be in the format `mm/dd/yyyy hh:mm am/pm`. The script will also accept strings that use dashes instead of slashes (`12-25-2019 6:00 AM`) or timestamps from SQL (`2019-12-25 06:00:00.0000000`).
- __Taxonomy and Multiple Choice__: Values should be the code name of the items, separated by a comma (for example `on_sale, bestseller`)
- __Rich Text__: This element will most likely require the most pre-processing; try to avoid complex HTML and text formatting. The list of supported HTML elements and their syntax can be found in our [documentation](https://docs.kontent.ai/reference/management-api-v2#section/Rich-text-element/html5-elements-allowed-in-rich-text).
Notably, you can insert links to other content items or assets by referencing and ID or external ID using the format described in [this section](https://docs.kontent.ai/reference/management-api-v2#section/Rich-text-element/links-in-rich-text). For example: `Buy our <a data-item-external-id="F4891FB5-5215-4795-8A6F-18A4F68394FD">new coffee</a>`. You can also add inline content items using the syntax [here](https://docs.kontent.ai/reference/management-api-v2#section/Rich-text-element/content-items-in-rich-text), for example `<object type="application/kenticocloud" data-type="item" data-external-id="59713"></object>`.  
Or, you can use special macros designed for this add-on. In the list below, the `identifier_type` can be "id" or "external-id":  
  | macro | description | format | example |
  | ----- | ----------- | ------ | ------- |
  | link-item | Inserts a link to a content item | `macro:identifier_type:identifier:text` | `##link-item:id:5946ca5d-cebe-4be1-b5f0-4cd0a0e43fb5:coffee is good##` |
  | link-asset | Inserts a link to an asset | `macro:identifier_type:identifier:text` | `##link-asset:id:0013263e-f2a9-40b1-9a3e-7ab6510bafe5:asset##` |
  | item | Inserts an inline content item | `macro:identifier_type:identifier` | `##item:external-id:article6##` |
- __Assets__: Values for Asset elements should be a comma-separated list, as the element can accept multiple Assets. The format for a single asset is `<identifier type>:<identifier>` where the type is either "id" or "external_id" and the identifier is the corresponding value. An example of updating multiple Assets at once is `id:0013263e-f2a9-40b1-9a3e-7ab6510bafe5,id:08bf515c-3b0e-4760-907b-6db0a22d41f3`.

## Importing the Content
Open the _Add-ons > Kentico Kontent > Import_ menu. You have 2 choices:

- Update existing, create if not found
- Always create new

If you choose the first option, an existing content item will attempt to be updated using the `external_id` of each row, or the `name` if there is no external ID column. If you choose the second option, a new item will always be created, but be aware that you may run into errors if you’ve provided an external ID that already exists in the system. As is the case with all errors, the script will simply skip that record and continue processing the rest of the Sheet.

After clicking the __Import__ button, please wait while the script runs. When it’s finished, a new window will open up containing a detailed record of the operations taken per-row, as well as the total number of:

- API calls made
- New content items created
- Language variants upserted
- Errors

# Contributing
To develop and test this Google Script project, first install [this Chrome extension](https://chrome.google.com/webstore/detail/google-apps-script-github/lfjcgcmkmjjlieihflfhjopckgpelofo?hl=en) which integrates Google Scripts with Git. Then fork this repository and create a new Google Script project on https://script.google.com/.

Use the new menus added by the extension (Repository, Branch, ..) to pull the code from your forked repository into the Script project. After you've made the desired code changes, test the add-on in a Google Sheet using the _Run > Test as add-on_ menu.

![Analytics](https://kentico-ga-beacon.azurewebsites.net/api/UA-69014260-4/Kentico/kontent-sheets-import?pixel)
