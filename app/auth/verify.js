import * as crypto from 'crypto';

export function verify(data, signature, publicKey) {
  let verifier = crypto.createVerify('sha256');
  verifier.update(data);
  return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
}
