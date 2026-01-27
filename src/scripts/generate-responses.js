const fs = require('fs');
const path = require('path');

// Chemins des fichiers (à adapter si besoin)
const INPUT_FILE = './native/headers/responses.h';
const OUTPUT_FILE = './src/lib/daas-responses.ts';

function parseEnum() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Erreur: Fichier ${INPUT_FILE} introuvable.`);
        return;
    }

    const content = fs.readFileSync(INPUT_FILE, 'utf8');
    const responseCodes = {};

    const regex = /([A-Z0-9_]+)\s*=\s*(0x[0-9A-Fa-f]+|[0-9]+)[UL]*/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
        const name = match[1];
        let value = match[2];

        // Conversion en nombre (gère l'hexa automatiquement)
        const numericValue = parseInt(value);

        // Formater le nom pour le rendre lisible (ex: RES_TX_RESPONSE_ABORTED -> Aborted)
        // On enlève le préfixe RES_ et on transforme le reste
        let label = name.replace(/^RES_/, '')
                        .replace(/_/g, ' ')
                        .toLowerCase()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

        // Cas particuliers ou raccourcis si tu veux nettoyer les labels
        label = label.replace(/^Tx Response /, '')
                     .replace(/^Sys Err /, 'Error: ');

        responseCodes[numericValue] = label;
    }

    // Génération du contenu TypeScript
    const tsContent = `export const DaasResponseCode: Record<number, string> = ${JSON.stringify(responseCodes, null, 4)};`;

    fs.writeFileSync(OUTPUT_FILE, tsContent);
    console.log(`✅ Fichier généré avec succès: ${OUTPUT_FILE}`);
}

parseEnum();