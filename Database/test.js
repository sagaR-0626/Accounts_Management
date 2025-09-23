// Usage:
// node test.js
// Then enter your plain password when prompted.

const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter plain password to hash: ', (plainPassword) => {
  bcrypt.hash(plainPassword, 10)
    .then(hash => {
      console.log('Hashed password:', hash);
      rl.close();
    })
    .catch(err => {
      console.error('Error hashing password:', err);
      rl.close();
    });
});