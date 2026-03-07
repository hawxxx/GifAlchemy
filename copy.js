const fs = require('fs');

try {
  const data = fs.readFileSync('/root/.gemini/antigravity/brain/64c1cd65-944d-49da-abbe-bbbb6465fe4b/media__1772853414898.png');
  fs.writeFileSync('./public/quick-try.gif', data);
  console.log('Copied successfully');
} catch (e) {
  console.error('Error:', e);
}
