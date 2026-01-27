
import { ReferenceModels } from './models/Reference';

console.log('Available Keys:', Object.keys(ReferenceModels));

const type = 'type-of-buyer';
const modelKey = type.replace(/-/g, '_');
console.log(`Input: ${type}`);
console.log(`Mapped Key: ${modelKey}`);
console.log(`Found: ${!!ReferenceModels[modelKey]}`);
