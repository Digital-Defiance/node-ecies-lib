/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  ECIESError,
  ECIESErrorTypeEnum,
  HexString,
} from '@digitaldefiance/ecies-lib';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { SignatureBuffer, SignatureString } from '../../types';

import { EciesCryptoCore } from './crypto-core';

/**
 * Signature-related functions for ECIES
 */
export class EciesSignature {
  private readonly cryptoCore: EciesCryptoCore;

  constructor(cryptoCore: EciesCryptoCore) {
    this.cryptoCore = cryptoCore;
  }

  /**
   * Signs arbitrary binary data with the given private key.
   * @param privateKey The private key to sign the message with.
   * @param data The data to sign.
   * @returns The signature (64 bytes: r + s).
   */
  public signMessage(privateKey: Buffer, data: Buffer): SignatureBuffer {
    const hash = sha256(data);
    // In v1.9.x, sign() returns a Signature object
    const signature = secp256k1.sign(hash, privateKey, {
      extraEntropy: false,
    });
    // Get compact format (64 bytes: r || s)
    return Buffer.from(signature.toCompactRawBytes()) as SignatureBuffer;
  }

  /**
   * Verifies arbitrary binary data with the given public key.
   * @param publicKey The public key to verify the message with.
   * @param data The data to verify.
   * @param signature The signature to verify (64 bytes: r + s).
   * @returns True if the signature is valid, false otherwise.
   */
  public verifyMessage(
    publicKey: Buffer,
    data: Buffer,
    signature: SignatureBuffer,
  ): boolean {
    if (signature.length !== 64) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidSignature);
    }

    // Normalize and validate the public key
    try {
      publicKey = this.cryptoCore.normalizePublicKey(publicKey);
    } catch {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidSenderPublicKey);
    }

    const hash = sha256(data);
    return secp256k1.verify(signature, hash, publicKey);
  }

  /**
   * Converts a signature string to a signature buffer.
   * @param signatureString - The signature string to convert.
   * @returns The signature buffer.
   */
  public signatureStringToSignatureBuffer(
    signatureString: HexString,
  ): SignatureBuffer {
    return Buffer.from(signatureString, 'hex') as SignatureBuffer;
  }

  /**
   * Converts a signature buffer to a signature string.
   * @param signatureBuffer - The signature buffer to convert.
   * @returns The signature string.
   */
  public signatureBufferToSignatureString(
    signatureBuffer: SignatureBuffer,
  ): SignatureString {
    return signatureBuffer.toString('hex') as SignatureString;
  }
}
