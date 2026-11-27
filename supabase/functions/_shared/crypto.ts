// Google の長期の鍵を、保管の前に AES-GCM で暗号化する(spec C12、plan/005 段階 B)。
// Web Crypto だけを使うので、Edge Functions(Deno)でも Vitest(Node)でも動く。

const VERSION = 'v1'

// Web Crypto に渡すため、ArrayBuffer に載った Uint8Array を返す(Deno の型チェックが ArrayBufferLike を受け付けないため。plan/027)
function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const text = atob(b64)
  const bytes = new Uint8Array(new ArrayBuffer(text.length))
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i)
  return bytes
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = fromBase64(keyB64)
  if (raw.length !== 32) throw new Error('暗号化用の鍵は 32 バイト(base64)である必要があります')
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** 暗号化した文字列を返す。形式は "v1:<iv>:<暗号文>"(どちらも base64) */
export async function encrypt(plaintext: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)))
  return `${VERSION}:${toBase64(iv)}:${toBase64(cipher)}`
}

export async function decrypt(encrypted: string, keyB64: string): Promise<string> {
  const [version, ivB64, cipherB64] = encrypted.split(':')
  if (version !== VERSION || !ivB64 || !cipherB64) throw new Error('暗号文の形式が違います')
  const key = await importKey(keyB64)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(ivB64) }, key, fromBase64(cipherB64))
  return new TextDecoder().decode(plain)
}
