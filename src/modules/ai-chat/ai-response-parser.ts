export class AiResponseParser {
  /**
   * Extracts the first valid JSON object from a string (even if mixed with text/markdown)
   */
  static extractJson(text: string): any {
    try {
      // Tìm đoạn JSON đầu tiên trong chuỗi
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      let jsonString = jsonMatch[0];
      // Làm sạch trailing comma trước khi parse
      jsonString = jsonString.replace(/,\s*(?=[}\]])/g, '');
      return JSON.parse(jsonString);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('❌ JSON parse error:', err);
      return null;
    }
  }
}
