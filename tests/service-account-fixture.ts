// Ephemeral test key; never use deployment credentials in automated tests.
let key: Promise<string> | undefined;
export function serviceAccountTestKey(): Promise<string> {
  return key ??= (async () => {
    const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    const bytes = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
    return `-----BEGIN PRIVATE KEY-----\n${btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""))}\n-----END PRIVATE KEY-----`;
  })();
}
