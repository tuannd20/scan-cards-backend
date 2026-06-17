import * as fs from 'fs';
import * as path from 'path';

interface PokemonAttack {
  name: string;
  damage: string;
  description: string;
  energy: string[];
  _id?: string;
}

interface PokemonCard {
  _id: string;
  name: string;
  hp: string;
  type: string[];
  attacks: PokemonAttack[];
  weakness: string;
  resistance: string;
  retreatCost: string;
  expansion: string;
  cardNumber: string;
  rarity: string;
  price: string;
  evolutionStatus: string;
  description?: string;
}

export class PokemonDescriptionGenerator {
  private readonly jsonFilePath: string;

  constructor() {
    this.jsonFilePath = path.join(process.cwd(), 'data', 'pokemon-info.json');
  }

  private loadPokemonData(): PokemonCard[] {
    const jsonData = fs.readFileSync(this.jsonFilePath, 'utf8');
    return JSON.parse(jsonData);
  }

  private savePokemonData(data: PokemonCard[]): void {
    fs.writeFileSync(this.jsonFilePath, JSON.stringify(data, null, 2), 'utf8');
  }

  private getEnergyTypeName(energyUrl: string): string {
    // Load energy mapping from JSON file
    try {
      const energyTypesPath = path.join(process.cwd(), 'data', 'energy_types.json');
      const energyTypesData = JSON.parse(fs.readFileSync(energyTypesPath, 'utf8'));
      
      const energyType = energyTypesData.find(e => e.img === energyUrl);
      return energyType ? energyType.name : 'Colorless';
    } catch (error) {
      // Fallback to basic mapping
      const energyMap = {
        'c5ec1646156fdb6d2db562afa7ec0e9b250cc023b7d5955d93265ebb23808031.png': 'Grass',
        '44abdd03385169a860610e23914434a0b94ccdaa86fae497d7726f99370c3386.png': 'Fire',
        'a6d1d1d31a4470f019db8ea0132c41054cd8c35e295eb3b33d7c849225b7073e.png': 'Water',
        '1be4e8211f0be0a51b792b6c31f34814f03d933feefda27d04b7516b611f3faf.png': 'Lightning',
        '98fa649102fdbf170a2be997d5ecf2016b2f5f92f372213e9e642f7ed9332993.png': 'Colorless',
        'bf88e3320870f157113cd48e0965ac9a0fa1630746041f59f07db92a9debf2ad.png': 'Psychic',
        'e749a52e91db7e684aa3d595e89badee67a5ebdaf77177977e70a71f76d447db.png': 'Fighting',
        '2fba6dc107035a268ab62384c736f7a96cdffd1080d0b2126917e074487c958b.png': 'Darkness',
        '66aed9c41d50cf8cee23597eb761a6767cabc73f6c610d54f599c3d2624da37c.png': 'Metal',
        '739fff897f789c085e47b79c223a66045a2bacf6340ae3ab347a7153c2406032.png': 'Dragon'
      };

      const fileName = energyUrl.split('/').pop() || '';
      return energyMap[fileName] || 'Colorless';
    }
  }

  private generateDescription(pokemon: PokemonCard): string {
    // Extract proper Pokemon name
    let pokemonName = this.extractPokemonName(pokemon.name);
    const hp = pokemon.hp;
    const types = pokemon.type.map(t => this.getEnergyTypeName(t));
    const mainType = types[0] || 'Normal';
    const attacks = pokemon.attacks.filter(a => a.name && a.name.trim() !== '');
    const rarity = pokemon.rarity;
    const evolutionStatus = this.cleanEvolutionStatus(pokemon.evolutionStatus);

    // Generate concise English description with better grammar
    let description = `${pokemonName} is a ${mainType}-type Pokemon`;
    
    if (hp && hp !== '0') {
      description += ` with ${hp} HP`;
    }

    if (attacks.length > 0) {
      const mainAttack = attacks[0];
      if (mainAttack.damage && mainAttack.damage !== '0' && mainAttack.damage !== '') {
        description += `, featuring the ${mainAttack.name} attack that deals ${mainAttack.damage} damage`;
      } else if (mainAttack.name) {
        description += `, featuring the ${mainAttack.name} attack`;
      }
    }

    // Add evolution status and rarity with better grammar
    const additionalInfo: string[] = [];
    
    if (evolutionStatus && !evolutionStatus.toLowerCase().includes('basic')) {
      const cleanStatus = this.formatEvolutionStatus(evolutionStatus);
      if (cleanStatus) {
        additionalInfo.push(`This ${cleanStatus} Pokemon`);
      }
    }

    if (rarity && rarity !== 'Common') {
      const article = rarity.toLowerCase().match(/^[aeiou]/) ? 'an' : 'a';
      additionalInfo.push(`${article} ${rarity.toLowerCase()} card`);
    } else if (rarity === 'Common') {
      additionalInfo.push(`a common card`);
    }

    if (additionalInfo.length > 0) {
      if (additionalInfo.length === 2) {
        description += `. ${additionalInfo[0]} and is ${additionalInfo[1]}`;
      } else {
        description += `. It is ${additionalInfo[0]}`;
      }
    }

    description += '.';

    // Remove any newline characters and normalize whitespace
    return description.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private shouldUpdateDescription(pokemon: PokemonCard): boolean {
    if (!pokemon.description) return true;
    
    // Remove newlines and normalize whitespace for checking
    const cleanDescription = pokemon.description.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Check if description contains newlines or is in Vietnamese
    const hasNewlines = pokemon.description.includes('\n') || pokemon.description.includes('\r');
    
    // Check if description is in Vietnamese (contains Vietnamese characters or patterns)
    const vietnamesePatterns = [
      /với/i,
      /và/i,
      /loại/i,
      /sức mạnh/i,
      /khả năng/i,
      /chiêu thức/i,
      /tấn công/i,
      /hiệu quả/i,
      /nổi bật/i,
      /sinh vật/i,
      /Pokémon loại/i,
      /trận đấu/i
    ];

    const isVietnamese = vietnamesePatterns.some(pattern => pattern.test(cleanDescription));
    
    // Check if description has poor quality indicators
    const poorQualityPatterns = [
      /^(Ethan|Misty|Cynthia|Team|Judge|Energy|Switch|Ball|Potion) is a/i,
      /Supporter is a/i,
      /Trainer Card is a/i
    ];
    
    const isPoorQuality = poorQualityPatterns.some(pattern => pattern.test(cleanDescription));

    return hasNewlines || isVietnamese || isPoorQuality;
  }

  private extractPokemonName(fullName: string): string {
    // Clean up newlines and extra whitespace first
    const cleanedName = fullName.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Handle special cases for trainer names and prefixes
    const cleanName = cleanedName
      .replace(/^(Ethan's|Misty's|Cynthia's|Team Rocket's|Steven's|Marnie's|Arven's|Lillie's|Iono's|N's|Hop's|Brock's|Karen's|Bill's|Lt\. Surge's|Sabrina's|Blaine's|Koga's|Giovanni's|Professor Oak's|Professor Elm's|Professor Birch's)\s+/i, '')
      .replace(/^(Team|Granite|Sacred|Energy|Judge|Emcee|TM|Spikemuth|Jamming|Levincia|Switch|Ball|Potion|Candy|Card|Mail|Tool|Stadium|Supporter|Trainer|Prize|Counter|Deck|Hand|Discard)\s*$/i, 'Trainer Card')
      .replace(/^(Mow|Heat|Wash|Teal|Hearthflame|Wellspring|Cornerstone)\s*(Rotom)?/i, 'Rotom')
      .replace(/^(Alolan|Galarian|Paldean|Hisuian)\s+/i, '')
      .replace(/\s+(ex|EX|GX|V|VMAX|VSTAR|Prime|Legend|BREAK|Tag Team|&)(\s|$)/gi, '')
      .trim();

    // If still empty or just trainer card, use a generic name
    if (!cleanName || cleanName.toLowerCase() === 'trainer card') {
      // Try to extract first meaningful word from original name
      const words = cleanedName.split(' ').filter(word => 
        word.length > 2 && 
        !word.match(/^(ex|EX|GX|V|VMAX|VSTAR|Prime|Legend|BREAK|Tag|Team|&|'s)$/i)
      );
      
      if (words.length > 0) {
        return words[0];
      }
      return 'Pokemon';
    }

    // Return the first word as the main Pokemon name
    const firstWord = cleanName.split(' ')[0];
    
    // Validate that this looks like a Pokemon name (not common trainer words)
    const trainerWords = ['Energy', 'Switch', 'Ball', 'Potion', 'Card', 'Mail', 'Tool', 'Stadium', 'Supporter', 'Trainer'];
    if (trainerWords.some(word => firstWord.toLowerCase() === word.toLowerCase())) {
      return 'Trainer Card';
    }
    
    return firstWord;
  }

  private cleanEvolutionStatus(evolutionStatus: string): string {
    if (!evolutionStatus) return '';
    
    // Clean up newlines and extra whitespace
    return evolutionStatus
      .replace(/\n\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatEvolutionStatus(evolutionStatus: string): string {
    if (!evolutionStatus) return '';
    
    // Extract just the stage info, ignore the Pokemon name after it
    const stageMatch = evolutionStatus.match(/^(Stage \d+|Basic)/i);
    if (stageMatch) {
      return stageMatch[1].toLowerCase();
    }
    
    return '';
  }

  public async generateDescriptionsForAll(forceUpdate: boolean = false): Promise<void> {
    console.log('Loading Pokemon data...');
    const pokemonData = this.loadPokemonData();
    
    console.log(`Found ${pokemonData.length} Pokemon cards`);
    
    let updatedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < pokemonData.length; i += batchSize) {
      const batch = pokemonData.slice(i, i + batchSize);
      
      for (const pokemon of batch) {
        if (forceUpdate || this.shouldUpdateDescription(pokemon)) {
          const newDescription = this.generateDescription(pokemon);
          pokemon.description = newDescription;
          updatedCount++;
          
          if (updatedCount % 50 === 0) {
            console.log(`Updated ${updatedCount} descriptions...`);
          }
        }
      }
      
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pokemonData.length / batchSize)}`);
    }
    
    console.log(`Saving updated data... (${updatedCount} descriptions updated)`);
    this.savePokemonData(pokemonData);
    
    console.log(`✅ Successfully updated ${updatedCount} Pokemon descriptions!`);
  }

  public async generateDescriptionForSingle(pokemonName: string): Promise<void> {
    const pokemonData = this.loadPokemonData();
    const pokemon = pokemonData.find(p => p.name.toLowerCase().includes(pokemonName.toLowerCase()));
    
    if (!pokemon) {
      throw new Error(`Pokemon with name "${pokemonName}" not found`);
    }
    
    const newDescription = this.generateDescription(pokemon);
    pokemon.description = newDescription;
    
    this.savePokemonData(pokemonData);
    console.log(`✅ Updated description for ${pokemon.name}: ${newDescription}`);
  }

  public getStats(): { total: number; withDescription: number; vietnameseDescription: number } {
    const pokemonData = this.loadPokemonData();
    const total = pokemonData.length;
    const withDescription = pokemonData.filter(p => p.description && p.description.trim() !== '').length;
    const vietnameseDescription = pokemonData.filter(p => this.shouldUpdateDescription(p)).length;
    
    return { total, withDescription, vietnameseDescription };
  }
}
