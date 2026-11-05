const STORAGE_KEY = 'mowathib_deputy_pending_credential_v1';
const EXPIRATION_HOURS = 24;

export interface PendingDeputyCredential {
  classId: number;
  deputyName: string;
  username: string;
  password: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Generates a strong, human-readable temporary password for the deputy.
 * Meets security standards: uppercase, lowercase, numbers, symbol, and minimum 8 characters.
 * Example format: Mowathib#7482
 */
export function generateSecureDeputyPassword(): string {
  const symbols = ['#', '@', '!', '$'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  let randomPart = '';
  // Generate 4 crypto-random digits
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(4);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 4; i++) {
      randomPart += (array[i] % 10).toString();
    }
  } else {
    randomPart = Math.floor(1000 + Math.random() * 9000).toString();
  }

  return `Mowathib${symbol}${randomPart}`;
}

export const deputyCredentialStorage = {
  save(classId: number, deputyName: string, username: string, password: string): PendingDeputyCredential {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRATION_HOURS * 60 * 60 * 1000);

    const credential: PendingDeputyCredential = {
      classId,
      deputyName,
      username,
      password,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
    } catch {
      // Ignore localStorage errors
    }

    return credential;
  },

  get(currentClassId?: number): PendingDeputyCredential | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed: PendingDeputyCredential = JSON.parse(raw);

      // Verify structure
      if (!parsed || !parsed.password || !parsed.expiresAt) {
        this.clear();
        return null;
      }

      // Check expiration
      if (new Date().getTime() > new Date(parsed.expiresAt).getTime()) {
        this.clear();
        return null;
      }

      // If classId specified, verify match
      if (currentClassId !== undefined && parsed.classId !== currentClassId) {
        return null;
      }

      return parsed;
    } catch {
      this.clear();
      return null;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  },
};
