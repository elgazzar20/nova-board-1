import fs from 'fs';
import https from 'https';

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

const dir = './public/models';

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AIStudioApp/1.0 (mohamedelgazzar700@gmail.com)' } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        reject(new Error(`Status ${response.statusCode} for ${url}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  for (const f of files) {
    console.log('Downloading', f.name);
    try {
        await download(f.url, `${dir}/${f.name}`);
        console.log('Success:', f.name);
    } catch(e) {
        console.error('Failed:', f.name, e.message);
    }
  }
}
main();
