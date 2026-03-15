export async function encryptData(
  data: string,
  password: string,
  onProgress?: (msg: string) => void,
): Promise<{ salt: string; iv: string; ct: string }> {
  onProgress?.('Deriving key (600k PBKDF2 rounds)...')

  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  onProgress?.('Encrypting...')
  const plaintext = enc.encode(data)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)

  return {
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    ct: arrayBufferToBase64(ciphertext),
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const u = new Uint8Array(buf)
  let b = ''
  for (let i = 0; i < u.length; i++) b += String.fromCharCode(u[i])
  return btoa(b)
}
