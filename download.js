import fs from 'fs';
import https from 'https';
import path from 'path';

const files = [
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/World_map_blank_without_borders.svg/1024px-World_map_blank_without_borders.svg.png', name: 'world_blank.png' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Equirectangular_projection_SW.jpg/1024px-Equirectangular_projection_SW.jpg', name: 'world_physical.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Egypt_map-blank.svg/1024px-Egypt_map-blank.svg.png', name: 'egypt.png' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Arab_World_-_Green.svg/1024px-Arab_World_-_Green.svg.png', name: 'arab_world.png' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Periodic_table_large-ar.svg/1280px-Periodic_table_large-ar.svg.png', name: 'periodic_table.png' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Stylised_atom_with_three_Bohr_model_orbits_and_stylised_nucleus.svg/1024px-Stylised_atom_with_three_Bohr_model_orbits_and_stylised_nucleus.svg.png', name: 'atom.png' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Planets2013.svg/1024px-Planets2013.svg.png', name: 'planets.png' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Human_body_features-ar.svg/800px-Human_body_features-ar.svg.png', name: 'anatomy.png' }
];

const dir = path.join(process.cwd(), 'public', 'models');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const f of files) {
    console.log('Downloading', f.name);
    await download(f.url, path.join(dir, f.name));
  }
  console.log('Done');
}
main();
