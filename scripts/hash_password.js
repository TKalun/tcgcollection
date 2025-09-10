// Node script — run `node scripts/hash_password.js yourpassword`
import bcrypt from 'bcryptjs';

const pw = process.argv[2];
if (!pw) {
  console.log('Usage: node scripts/hash_password.js <password>');
  process.exit(1);
}
const hash = bcrypt.hashSync(pw, 12);
console.log(hash);
