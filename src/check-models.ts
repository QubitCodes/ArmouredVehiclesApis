
import { ReferenceModels } from './models/Reference';

console.log('--- Verification Start ---');
const keys = Object.keys(ReferenceModels);
console.log('Available Reference Keys:', keys.join(', '));
console.log('Has type_of_buyer:', keys.includes('type_of_buyer'));
console.log('--- Verification End ---');
