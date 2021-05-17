import { KontentRichText } from '@kentico-ericd/kontent-richtext-validation'

const validate = (text) => {
    return KontentRichText.validate(text);
};

export { validate };
