const fs = require('fs');
let content = fs.readFileSync('src/components/StatsDashboard.tsx', 'utf-8');

const target = `<td className="p-2 font-mono text-slate-400">{m.tel_mob || m.tel1 || '—'}</td>`;
const replacement = `<td className="p-2 font-mono text-slate-400 leading-tight">
                          {(() => {
                            const tel = m.tel_mob || m.tel1;
                            if (!tel) return '—';
                            const parts = tel.split(/[/,;]/).map(p => p.trim()).filter(Boolean);
                            if (parts.length <= 1) return tel;
                            return (
                              <div className="flex flex-col space-y-0.5">
                                {parts.map((p, i) => (
                                  <span key={i} className="block whitespace-nowrap">{p}</span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/StatsDashboard.tsx', content);
    console.log('Fixed tel formatting');
} else {
    console.log('Target not found');
}
