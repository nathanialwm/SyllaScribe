import bcrypt from 'bcrypt';

// get the VSCode extension for MongoDB, make sure you ran npm install after cloning the repo
// in main.jsx we connect to the database using mongoose and the connection string stored in .env file
// You will need to create your own .env file in the root directory with the following content

// The mongoose connection may need to take place in another file, I am not certain of this.

// Bcrypt is our password hashing algorithm, before adding password to database we hash it for security
const password = 'tempPWD1'
const hash = await bcrypt.hash(password, 11);
console.log(`Hashed password: ${hash}`);
// It adds salt as well already

console.log(`Password matches: ${await bcrypt.compare('tempPWD1', hash)}`);
// here the .compare function hashes the first argument and compares with second argument
// so the first input should be {user_input}
// bcrypt.compare({user_input}, {stored_hash_from_db})