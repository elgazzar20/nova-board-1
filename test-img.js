import https from 'https';
https.get('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/World_map_blank_without_borders.svg/1024px-World_map_blank_without_borders.svg.png', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  console.log(res.statusCode);
  console.log(res.headers);
});
