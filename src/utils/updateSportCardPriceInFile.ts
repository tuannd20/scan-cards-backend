import * as fs from 'fs';
import * as path from 'path';

export async function updateSportCardPriceInFile(sport: string, playerName: string, price: string) {
  const sportCardsDir = path.join(process.cwd(), 'sport-cards');
  const files = fs.readdirSync(sportCardsDir).filter((file: string) => file.endsWith('.json'));
  let found = false;
  for (const file of files) {
    const sportName = file.replace('-cards.json', '').split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    if (sportName.toLowerCase() === sport.toLowerCase()) {
      const filePath = path.join(sportCardsDir, file);
      const rawData = fs.readFileSync(filePath, 'utf8');
      let playerGroups = JSON.parse(rawData);
      let changed = false;
      for (const group of playerGroups) {
        const groupName = (group.playerName || group.player || group.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const inputName = (playerName || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (groupName === inputName) {
          group.price = price;
          if (group.cards && Array.isArray(group.cards)) {
            for (const card of group.cards) {
              card.price = price;
            }
          }
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(playerGroups, null, 2), 'utf8');
        found = true;
      }
    }
  }
  if (!found) {
    console.warn(`[updateSportCardPriceInFile] Không tìm thấy player '${playerName}' trong sport '${sport}' để cập nhật price.`);
  }
}
