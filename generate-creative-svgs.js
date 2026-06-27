import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'public', 'models');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function writeSvg(filename, width, height, content) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
    <rect width="100%" height="100%" fill="#ffffff" rx="16"/>
    ${content}
  </svg>`;
  fs.writeFileSync(path.join(dir, filename), svg);
}

// 1. World Blank Map
writeSvg('world_blank.svg', 800, 400, `
  <g fill="#e2e8f0" stroke="#94a3b8" stroke-width="2">
    <!-- North America -->
    <path d="M 150 50 Q 200 20 250 80 T 200 180 Q 120 180 150 50" />
    <!-- South America -->
    <path d="M 230 180 Q 280 200 250 300 T 210 350 Q 180 250 230 180" />
    <!-- Europe & Asia -->
    <path d="M 400 60 Q 550 10 700 80 T 750 200 Q 600 220 500 150 Q 400 180 400 60" />
    <!-- Africa -->
    <path d="M 380 160 Q 480 150 500 250 T 430 320 Q 350 250 380 160" />
    <!-- Australia -->
    <path d="M 650 250 Q 750 250 720 320 T 650 320 Q 620 280 650 250" />
  </g>
`);

// 2. World Physical Map
writeSvg('world_physical.svg', 800, 400, `
  <rect width="100%" height="100%" fill="#0ea5e9" rx="16"/>
  <g fill="#22c55e" stroke="#15803d" stroke-width="2">
    <!-- North America -->
    <path d="M 150 50 Q 200 20 250 80 T 200 180 Q 120 180 150 50" />
    <!-- South America -->
    <path d="M 230 180 Q 280 200 250 300 T 210 350 Q 180 250 230 180" />
    <!-- Europe & Asia -->
    <path d="M 400 60 Q 550 10 700 80 T 750 200 Q 600 220 500 150 Q 400 180 400 60" />
    <!-- Africa -->
    <path d="M 380 160 Q 480 150 500 250 T 430 320 Q 350 250 380 160" />
    <!-- Australia -->
    <path d="M 650 250 Q 750 250 720 320 T 650 320 Q 620 280 650 250" />
  </g>
  <!-- Mountain ranges overlay -->
  <g fill="#a16207" opacity="0.6">
    <polygon points="170,80 180,60 190,80" />
    <polygon points="180,90 190,70 200,90" />
    <polygon points="190,100 200,80 210,100" />
    
    <polygon points="230,220 240,200 250,220" />
    <polygon points="235,240 245,220 255,240" />

    <polygon points="450,110 460,90 470,110" />
    <polygon points="470,110 480,90 490,110" />
  </g>
`);

// 3. Egypt Map
writeSvg('egypt.svg', 400, 400, `
  <rect width="100%" height="100%" fill="#fef08a" rx="16"/>
  <!-- Nile River -->
  <path d="M 200 50 Q 220 150 180 250 T 150 400" fill="none" stroke="#3b82f6" stroke-width="15" stroke-linecap="round"/>
  <!-- Delta -->
  <polygon points="200,50 150,0 250,0" fill="#22c55e"/>
  <!-- Text -->
  <text x="200" y="200" font-family="sans-serif" font-size="32" font-weight="bold" fill="#854d0e" opacity="0.5" text-anchor="middle">Egypt</text>
`);

// 4. Arab World Map
writeSvg('arab_world.svg', 600, 400, `
  <rect width="100%" height="100%" fill="#bae6fd" rx="16"/>
  <g fill="#16a34a" stroke="#ffffff" stroke-width="2">
    <!-- North Africa -->
    <path d="M 50 150 L 300 150 L 320 250 L 250 300 L 50 250 Z" />
    <!-- Arabian Peninsula -->
    <path d="M 320 150 L 450 120 L 500 200 L 400 300 L 320 250 Z" />
    <!-- Levant -->
    <path d="M 300 150 L 320 100 L 350 120 L 320 150 Z" />
  </g>
  <text x="300" y="200" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">Arab World</text>
`);

// 5. Periodic Table
writeSvg('periodic_table.svg', 800, 400, `
  <rect width="100%" height="100%" fill="#f8fafc" rx="16"/>
  <g fill="#e0f2fe" stroke="#0284c7" stroke-width="1">
    ` + Array.from({length: 18}).map((_, i) => 
      Array.from({length: 7}).map((_, j) => {
        if ((j===0 && (i>0 && i<17)) || (j===1 && (i>1 && i<12)) || (j===2 && (i>1 && i<12))) return '';
        return '<rect x="' + (50 + i * 40) + '" y="' + (50 + j * 40) + '" width="36" height="36" rx="4"/>';
      }).join('')
    ).join('') + `
  </g>
  <!-- Lanthanides / Actinides -->
  <g fill="#fef08a" stroke="#ca8a04" stroke-width="1">
    ` + Array.from({length: 14}).map((_, i) => 
      '<rect x="' + (130 + i * 40) + '" y="350" width="36" height="36" rx="4"/>' +
      '<rect x="' + (130 + i * 40) + '" y="400" width="36" height="36" rx="4"/>'
    ).join('') + `
  </g>
`);

// 6. Atom Structure
writeSvg('atom.svg', 400, 400, `
  <rect width="100%" height="100%" fill="#1e293b" rx="16"/>
  <!-- Orbits -->
  <g fill="none" stroke="#60a5fa" stroke-width="2" opacity="0.5">
    <ellipse cx="200" cy="200" rx="150" ry="50" transform="rotate(0 200 200)"/>
    <ellipse cx="200" cy="200" rx="150" ry="50" transform="rotate(60 200 200)"/>
    <ellipse cx="200" cy="200" rx="150" ry="50" transform="rotate(120 200 200)"/>
  </g>
  <!-- Nucleus -->
  <g>
    <circle cx="195" cy="195" r="10" fill="#ef4444"/>
    <circle cx="205" cy="195" r="10" fill="#eab308"/>
    <circle cx="200" cy="205" r="10" fill="#ef4444"/>
    <circle cx="190" cy="205" r="10" fill="#eab308"/>
  </g>
  <!-- Electrons -->
  <circle cx="50" cy="200" r="6" fill="#60a5fa"/>
  <circle cx="280" cy="100" r="6" fill="#60a5fa"/>
  <circle cx="120" cy="300" r="6" fill="#60a5fa"/>
`);

// 7. Solar System
writeSvg('planets.svg', 800, 400, `
  <rect width="100%" height="100%" fill="#0f172a" rx="16"/>
  <!-- Sun -->
  <circle cx="-50" cy="200" r="150" fill="#f59e0b" filter="drop-shadow(0 0 20px #f59e0b)"/>
  
  <g fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="4">
    <circle cx="-50" cy="200" r="200"/>
    <circle cx="-50" cy="200" r="280"/>
    <circle cx="-50" cy="200" r="380"/>
    <circle cx="-50" cy="200" r="500"/>
    <circle cx="-50" cy="200" r="650"/>
    <circle cx="-50" cy="200" r="820"/>
  </g>
  <!-- Planets -->
  <!-- Mercury --> <circle cx="150" cy="200" r="5" fill="#a8a29e"/>
  <!-- Venus --> <circle cx="230" cy="200" r="12" fill="#d6d3d1"/>
  <!-- Earth --> <circle cx="330" cy="200" r="14" fill="#3b82f6"/>
  <!-- Mars --> <circle cx="450" cy="200" r="10" fill="#dc2626"/>
  <!-- Jupiter --> <circle cx="600" cy="200" r="40" fill="#fdba74"/>
  <!-- Saturn --> 
  <g transform="translate(770 200)">
    <circle cx="0" cy="0" r="30" fill="#fcd34d"/>
    <ellipse cx="0" cy="0" rx="55" ry="10" fill="none" stroke="#fbbf24" stroke-width="4" transform="rotate(-20)"/>
  </g>
`);

// 8. Human Anatomy
writeSvg('anatomy.svg', 400, 600, `
  <rect width="100%" height="100%" fill="#f1f5f9" rx="16"/>
  <g stroke="#475569" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <!-- Head -->
    <circle cx="200" cy="100" r="40" fill="#fed7aa"/>
    <!-- Spine/Body -->
    <path d="M 200 140 L 200 350" />
    <!-- Shoulders -->
    <path d="M 140 180 Q 200 160 260 180" />
    <!-- Arms -->
    <path d="M 140 180 L 120 300 L 140 400" />
    <path d="M 260 180 L 280 300 L 260 400" />
    <!-- Pelvis -->
    <path d="M 160 350 Q 200 370 240 350" />
    <!-- Legs -->
    <path d="M 160 350 L 160 500 L 180 600" />
    <path d="M 240 350 L 240 500 L 220 600" />
  </g>
  <!-- Organs placeholders -->
  <g>
    <!-- Brain -->
    <ellipse cx="200" cy="85" rx="25" ry="15" fill="#fca5a5" opacity="0.8"/>
    <!-- Heart -->
    <path d="M 200 220 A 15 15 0 0 1 230 220 Q 230 250 200 270 Q 170 250 170 220 A 15 15 0 0 1 200 220 Z" fill="#ef4444" opacity="0.8"/>
    <!-- Lungs -->
    <ellipse cx="175" cy="230" rx="15" ry="30" fill="#fecaca" opacity="0.6"/>
    <ellipse cx="225" cy="230" rx="15" ry="30" fill="#fecaca" opacity="0.6"/>
  </g>
`);

console.log('Creative SVGs generated successfully!');
