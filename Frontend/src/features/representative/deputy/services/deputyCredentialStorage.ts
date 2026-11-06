
const STORAGE_KEY = 'mowathib_deputy_pending_credential_v1';

export interface PendingDeputyCredential {
  classId: number;
  deputyName: string;
  username: string;
  password: string;
  createdAt: string;
}

/**
 * Generates a secure temporary password.
 * Example: Mowathib#7482
 */
export function generateSecureDeputyPassword(): string {
  const symbols = ['#', '@', '!', '$'];

  const randomValues = new Uint32Array(5);
  crypto.getRandomValues(randomValues);

  const symbol = symbols[randomValues[0] % symbols.length];

  let randomPart = '';

  for (let i = 1; i < randomValues.length; i++) {
    randomPart += (randomValues[i] % 10).toString();
  }

  return `Mowathib${symbol}${randomPart}`;
}

/**
 * Generates a random deputy username.
 * Checks against existing usernames before returning.
 */
export function generateDeputyUsername(
  existingUsernames: string[] = []
): string {
  const existing = new Set(
    existingUsernames.map((username) => username.toLowerCase())
  );

  for (let attempt = 0; attempt < 10; attempt++) {
    const randomBytes = new Uint8Array(8);

    crypto.getRandomValues(randomBytes);

    const suffix = Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const username = `dep_${suffix}`;

    if (!existing.has(username.toLowerCase())) {
      return username;
    }
  }

  throw new Error('Failed to generate a unique deputy username.');
}

export const deputyCredentialStorage = {
  /**
   * Saves deputy credentials permanently in localStorage.
   * There is no automatic expiration.
   */
  save(
    classId: number,
    deputyName: string,
    username: string,
    password: string
  ): PendingDeputyCredential {
    const credential: PendingDeputyCredential = {
      classId,
      deputyName,
      username,
      password,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(credential)
      );
    } catch (error) {
      console.error(
        'Failed to save deputy credentials:',
        error
      );
    }

    return credential;
  },

  /**
   * Retrieves saved credentials.
   * Old expiresAt properties are ignored.
   */
  get(currentClassId?: number): PendingDeputyCredential | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);

      if (!parsed || typeof parsed !== 'object') {
        this.clear();
        return null;
      }

      const credential = parsed as PendingDeputyCredential;

      const isValid =
        typeof credential.classId === 'number' &&
        typeof credential.deputyName === 'string' &&
        typeof credential.username === 'string' &&
        typeof credential.password === 'string' &&
        credential.password.length > 0;

      if (!isValid) {
        this.clear();
        return null;
      }

      // Only return credentials belonging to the current class.
      if (
        currentClassId !== undefined &&
        credential.classId !== currentClassId
      ) {
        return null;
      }

      // No expiration check.
      return credential;
    } catch (error) {
      console.error(
        'Failed to retrieve deputy credentials:',
        error
      );

      this.clear();
      return null;
    }
  },

  /**
   * Manually deletes saved credentials.
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error(
        'Failed to clear deputy credentials:',
        error
      );
    }
  },
};
