// Script para atualizar slides "O que diz a norma" nos arquivos HTML
// Basta rodar: node updateNormaSlides.js

const fs = require('fs');
const path = require('path');

// Arquivos alvo
const files = [
  'public/aula2.html',
  'public/aula3.html',
  'public/aula4.html',
  'public/aula5.html',
  'public/aula6.html',
];

// Badge HTML
const badgeCPC = `<span style="background:#1a237e;color:#fff;padding:2px 8px;border-radius:12px;font-size:0.9em;margin-right:8px;vertical-align:middle;">CPC 51</span>`;
const badgeNBC = `<span style=\"background:#00695c;color:#fff;padding:2px 8px;border-radius:12px;font-size:0.9em;margin-right:8px;vertical-align:middle;\">NBC TG 23</span>`;

// Função para atualizar cada arquivo
function updateFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Atualiza slides "O que diz a norma"
  content = content.replace(/(<h2[^>]*>\s*)(O que diz a norma)(\s*<\/h2>)([\s\S]*?)(<div class=\"col-6[^"]*\">[\s\S]*?<\/div>)([\s\S]*?<div class=\"col-6[^"]*\">[\s\S]*?<\/div>)/g,
    (match, h2start, h2text, h2end, afterH2, leftCol, rightCol) => {
      // Exceção para slides IAS 8 em aula6.html
      if (file.endsWith('aula6.html') && /IAS 8/.test(match)) {
        return `${h2start}${badgeNBC}NBC TG 23${h2end}${afterH2}${leftCol}${rightCol}`;
      }
      // Normal: CPC 51
      return `${h2start}${badgeCPC}CPC 51${h2end}${afterH2}${leftCol}${rightCol}`;
    }
  );

  // Atualiza subtítulo e rodapé
  content = content.replace(/(<div class=\"col-6[^"]*\">[\s\S]*?<\/div>)([\s\S]*?<div class=\"col-6[^"]*\">[\s\S]*?<\/div>)/g,
    (match, leftCol, rightCol) => {
      // Atualiza subtítulo e rodapé no rightCol
      let updatedRight = rightCol
        .replace(/<h3[^>]*>[^<]*<\/h3>/, '<h3 style="margin-top:0.5em;">Tradução livre do pronunciamento</h3>')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/, '<footer style="font-size:0.9em;color:#555;">Fonte: Tradução livre do pronunciamento oficial</footer>');
      return leftCol + updatedRight;
    }
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Atualizado: ${file}`);
}

files.forEach(updateFile);

console.log('Slides "O que diz a norma" atualizados com sucesso!');
