const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
console.log('\nYour JWT_SECRET:');
console.log(secret);
console.log('\nAdd this to your .env file as:');
console.log(`JWT_SECRET=${secret}\n`);

