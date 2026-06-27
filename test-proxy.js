import https from 'https';

const url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/World_map_blank_without_borders.svg/1024px-World_map_blank_without_borders.svg.png');

https.get(url, (res) => {
  console.log(res.statusCode);
  if (res.statusCode >= 300 && res.statusCode < 400) {
    console.log('redirect to', res.headers.location);
  }
}).on('error', (e) => {
  console.error(e);
});
