import * as fs from 'fs';
import * as path from 'path';

// Energy type mappings - loaded once at startup
let energyMap: { [key: string]: string } = {};
let reverseEnergyMap: { [key: string]: string } = {};

// Load energy mappings from JSON file
function loadEnergyMappings() {
  try {
    const energyTypesPath = path.join(process.cwd(), 'data', 'energy_types.json');
    if (fs.existsSync(energyTypesPath)) {
      const energyTypes = JSON.parse(fs.readFileSync(energyTypesPath, 'utf8'));
      
      energyTypes.forEach((energy: { name: string; img: string }) => {
        energyMap[energy.name] = energy.img;
        reverseEnergyMap[energy.img] = energy.name;
      });
      
      console.log(`✅ Loaded ${energyTypes.length} energy type mappings`);
    } else {
      console.warn('⚠️ energy_types.json not found, energy conversion disabled');
    }
  } catch (error) {
    console.error('❌ Error loading energy mappings:', error);
  }
}

// Initialize mappings
loadEnergyMappings();

/**
 * Convert energy name to image URL
 * @param energyName - Name of the energy type
 * @returns Image URL or original name if not found
 */
export function energyNameToImage(energyName: string): string {
  if (!energyName || energyName === '') return energyName;
  return energyMap[energyName] || energyName;
}

/**
 * Convert energy image URL to name
 * @param energyUrl - Image URL of the energy type
 * @returns Energy name or original URL if not found
 */
export function energyImageToName(energyUrl: string): string {
  if (!energyUrl || energyUrl === '') return energyUrl;
  return reverseEnergyMap[energyUrl] || energyUrl;
}

/**
 * Check if a string is an energy image URL
 * @param value - String to check
 * @returns True if it's an energy image URL
 */
export function isEnergyImageUrl(value: string): boolean {
  return Boolean(value && value.includes('static.tcgcollector.com/content/images/'));
}

/**
 * Convert energy values in card data for display (URLs to names for filters)
 * @param cardData - Pokemon card data
 * @returns Card data with energy names for filtering
 */
export function convertEnergyForFilter(cardData: any): any {
  const converted = { ...cardData };
  
  // Convert type array
  if (Array.isArray(converted.type)) {
    converted.type = converted.type.map((type: string) => 
      isEnergyImageUrl(type) ? energyImageToName(type) : type
    );
  }
  
  // Convert weakness
  if (converted.weakness && isEnergyImageUrl(converted.weakness)) {
    converted.weakness = energyImageToName(converted.weakness);
  }
  
  // Convert resistance
  if (converted.resistance && isEnergyImageUrl(converted.resistance)) {
    converted.resistance = energyImageToName(converted.resistance);
  }
  
  // Convert attack energies
  if (Array.isArray(converted.attacks)) {
    converted.attacks = converted.attacks.map((attack: any) => {
      if (Array.isArray(attack.energy)) {
        return {
          ...attack,
          energy: attack.energy.map((energy: string) => 
            isEnergyImageUrl(energy) ? energyImageToName(energy) : energy
          )
        };
      }
      return attack;
    });
  }
  
  return converted;
}

/**
 * Get all available energy type names for filtering
 * @returns Array of energy type names
 */
export function getEnergyTypeNames(): string[] {
  return Object.keys(energyMap);
}

/**
 * Get all available energy type images
 * @returns Array of energy type image URLs
 */
export function getEnergyTypeImages(): string[] {
  return Object.values(energyMap);
}

/**
 * Get energy type mappings for frontend
 * @returns Object with name->image mappings
 */
export function getEnergyMappings(): { [key: string]: string } {
  return { ...energyMap };
}
