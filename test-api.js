const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: '1', mobile: '9999999999' },
  'e45059f30d8d26274aafdb31252ad3c9662c5671d0a7c2a480be71d1d7f3c51e448b199e9cf780985104a9fb22a96460'
);
const advanced = JSON.stringify({ heights: ['165-173'] });
fetch(`http://localhost:4000/api/search?advanced=${encodeURIComponent(advanced)}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => console.log('Search Results:', JSON.stringify(data, null, 2)))
.catch(console.error);
