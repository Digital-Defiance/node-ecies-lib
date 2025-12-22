/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  getNodeEciesTranslation,
  NodeEciesStringKey,
} from '../../i18n/ecies-i18n-factory';
import { IConstants } from '../../interfaces/constants';

/**
 * Base interface for invariants
 */
interface IInvariant {
  name: string;
  description: string;
  check(config: IConstants): boolean;
  errorMessage(config: IConstants): string;
}

/**
 * Base class for invariants
 */
abstract class BaseInvariant implements IInvariant {
  constructor(
    public readonly name: string,
    public readonly description: string,
  ) {}

  abstract check(config: IConstants): boolean;
  abstract errorMessage(config: IConstants): string;
}

/**
 * Node.js-specific recipient ID consistency invariant.
 *
 * Extends the base ecies-lib invariant to also validate node-specific
 * ENCRYPTION.RECIPIENT_ID_SIZE constant.
 *
 * This invariant would have caught the 12 vs 32 byte discrepancy.
 *
 * Checks:
 * - MEMBER_ID_LENGTH === idProvider.byteLength
 * - ECIES.MULTIPLE.RECIPIENT_ID_SIZE === idProvider.byteLength
 * - ENCRYPTION.RECIPIENT_ID_SIZE === idProvider.byteLength (Node-specific)
 * - All values must be in sync
 */
export class RecipientIdConsistencyInvariant extends BaseInvariant {
  constructor() {
    super(
      'NodeRecipientIdConsistency',
      'All recipient ID size configurations must match the ID provider byte length (including Node-specific ENCRYPTION constant)',
    );
  }

  check(config: IConstants): boolean {
    const baseChecks =
      config.MEMBER_ID_LENGTH === config.idProvider.byteLength &&
      config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE === config.idProvider.byteLength;

    // ENCRYPTION is node-specific and may not exist in all configs
    if (config.ENCRYPTION && 'RECIPIENT_ID_SIZE' in config.ENCRYPTION) {
      return (
        baseChecks &&
        config.ENCRYPTION.RECIPIENT_ID_SIZE === config.idProvider.byteLength
      );
    }

    return baseChecks;
  }

  errorMessage(config: IConstants): string {
    const issues: string[] = [];

    if (config.MEMBER_ID_LENGTH !== config.idProvider.byteLength) {
      issues.push(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Invariant_MemberIdLengthMismatchTemplate,
          {
            actual: config.MEMBER_ID_LENGTH,
            expected: config.idProvider.byteLength,
          },
        ),
      );
    }

    if (
      config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE !== config.idProvider.byteLength
    ) {
      issues.push(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Invariant_EciesMultipleRecipientIdSizeMismatchTemplate,
          {
            actual: config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE,
            expected: config.idProvider.byteLength,
          },
        ),
      );
    }

    if (config.ENCRYPTION && 'RECIPIENT_ID_SIZE' in config.ENCRYPTION) {
      if (
        config.ENCRYPTION.RECIPIENT_ID_SIZE !== config.idProvider.byteLength
      ) {
        issues.push(
          getNodeEciesTranslation(
            NodeEciesStringKey.Error_Invariant_EncryptionRecipientIdSizeMismatchTemplate,
            {
              actual: config.ENCRYPTION.RECIPIENT_ID_SIZE,
              expected: config.idProvider.byteLength,
            },
          ),
        );
      }
    }

    return getNodeEciesTranslation(
      NodeEciesStringKey.Error_Invariant_NodeRecipientIdConsistency_FailedTemplate,
      {
        issues: issues.join('\n  '),
      },
    );
  }
}
