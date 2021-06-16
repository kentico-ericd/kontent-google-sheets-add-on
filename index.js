import { KontentRichText } from '@kentico-ericd/kontent-richtext-validation'

const validateRichText = (text) => {
    return KontentRichText.validate(text, true);
};

export { validateRichText };
