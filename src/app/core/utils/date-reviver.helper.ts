/**
 * Utilitaire pour reconvertir automatiquement les chaînes ISO en objets Date
 */
export class DateReviverHelper {
  // Regex pour détecter les chaînes de date ISO 8601
  private static readonly ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

  /**
   * Reconvertit récursivement toutes les chaînes de date ISO en objets Date
   * @param obj L'objet à traiter
   * @returns L'objet avec les dates reconverties
   */
  static reviveData<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Si c'est une chaîne qui ressemble à une date ISO
    if (typeof obj === 'string' && this.ISO_DATE_REGEX.test(obj)) {
      const date = new Date(obj);
      // Vérifier que c'est une date valide
      return !isNaN(date.getTime()) ? (date as unknown as T) : obj;
    }

    // Si c'est un tableau
    if (Array.isArray(obj)) {
      return obj.map(item => this.reviveData(item)) as unknown as T;
    }

    // Si c'est un objet
    if (typeof obj === 'object'&& !(obj instanceof Date)) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.reviveData(value);
      }
      return result as T;
    }

    // Pour les autres types (number, boolean, etc.)
    return obj;
  }
}
