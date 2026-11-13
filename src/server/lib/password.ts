import argon2 from "argon2";

/**
 * Hash e verificação de senha com Argon2id.
 *
 * Parâmetros conservadores e seguros (acima dos mínimos do OWASP).
 * O hash resultante já embute o salt e os parâmetros — não armazenar nada à
 * parte. A senha em texto puro nunca é logada nem persistida.
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Hash malformado/erro de verificação → tratado como falha de credencial.
    return false;
  }
}
