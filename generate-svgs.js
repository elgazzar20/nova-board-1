import fs from 'fs';
import path from 'path';

const files = [
  { text: "World Blank Map", name: 'world_blank.png' },
  { text: "World Physical Map", name: 'world_physical.jpg' },
  { text: "Egypt Map", name: 'egypt.png' },
  { text: "Arab World Map", name: 'arab_world.png' },
  { text: "Periodic Table", name: 'periodic_table.png' },
  { text: "Atom Structure", name: 'atom.png' },
  { text: "Solar System", name: 'planets.png' },
  { text: "Human Anatomy", name: 'anatomy.png' }
];

const dir = path.join(process.cwd(), 'public', 'models');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

files.forEach(f => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
    <rect width="100%" height="100%" fill="#e2e8f0"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="24" fill="#475569" text-anchor="middle" dominant-baseline="middle">${f.text}</text>
  </svg>`;
  // write as svg, we will update the code to use the .svg extension later
  fs.writeFileSync(path.join(dir, f.name.replace('.jpg', '.svg').replace('.png', '.svg')), svg);
});
console.log('Done');
