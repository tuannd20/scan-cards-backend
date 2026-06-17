import * as fs from 'fs';
import * as path from 'path';

export class EnergyTypeService {
  private static energyTypes: { name: string; img: string }[] = [];

  static loadEnergyTypes(): void {
    if (this.energyTypes.length === 0) {
      const filePath = path.resolve(process.cwd(), 'data', 'energy_types.json');
      const raw = fs.readFileSync(filePath, 'utf8');
      this.energyTypes = JSON.parse(raw);
    }
  }

  static getEnergyType(name: string): { name: string; img: string } | null {
    this.loadEnergyTypes();
    if (!name) return null;
    const found = this.energyTypes.find(e => e.name.toLowerCase() === name.toLowerCase());
    return found || null;
  }

  static getEnergyTypeByImg(img: string): { name: string; img: string } | null {
    this.loadEnergyTypes();
    if (!img) return null;
    const found = this.energyTypes.find(e => e.img === img);
    return found || null;
  }

  static getEnergyImg(name: string): string | null {
    this.loadEnergyTypes();
    if (!name) return null;
    const found = this.energyTypes.find(e => e.name.toLowerCase() === name.toLowerCase());
    return found ? found.img : null;
  }
}
