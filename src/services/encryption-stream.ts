/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  NodeEciesComponentId,
  NodeEciesStringKey,
} from '../i18n/ecies-i18n-factory';
import { getNodeEciesI18nEngine } from '../i18n/node-ecies-i18n-setup';
import { IEncryptedChunk } from '../interfaces/encrypted-chunk';
import { IMultiRecipientChunk } from '../interfaces/multi-recipient-chunk';
import {
  DEFAULT_STREAM_CONFIG,
  IStreamConfig,
} from '../interfaces/stream-config';
import { IStreamProgress } from '../interfaces/stream-progress';

import { ChunkProcessor } from './chunk-processor';
import { ECIESService } from './ecies/service';
import { MultiRecipientProcessor } from './multi-recipient-processor';
import { ProgressTracker } from './progress-tracker';

export interface IEncryptStreamOptions {
  chunkSize?: number;
  signal?: AbortSignal;
  includeChecksums?: boolean;
  onProgress?: (progress: IStreamProgress) => void;
}

export interface IDecryptStreamOptions {
  signal?: AbortSignal;
  onProgress?: (progress: IStreamProgress) => void;
}

export class EncryptionStream {
  private readonly processor: ChunkProcessor;
  private readonly multiRecipientProcessor: MultiRecipientProcessor;
  private readonly engine = getNodeEciesI18nEngine();

  constructor(
    private readonly ecies: ECIESService,
    private readonly config: IStreamConfig = DEFAULT_STREAM_CONFIG,
    processor?: ChunkProcessor,
    multiRecipientProcessor?: MultiRecipientProcessor,
  ) {
    // Use injected dependencies or create defaults
    this.processor = processor ?? new ChunkProcessor(ecies);
    this.multiRecipientProcessor =
      multiRecipientProcessor ??
      new MultiRecipientProcessor(ecies.core, ecies.core.consts);
  }

  public async *encryptStream(
    source: AsyncIterable<Buffer>,
    publicKey: Buffer,
    options: IEncryptStreamOptions = {},
  ): AsyncGenerator<IEncryptedChunk, void, unknown> {
    if (!publicKey || (publicKey.length !== 65 && publicKey.length !== 33)) {
      throw new Error(
        this.engine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_Stream_InvalidPublicKeyLength,
        ),
      );
    }

    const chunkSize = options.chunkSize ?? this.config.chunkSize;
    const includeChecksums =
      options.includeChecksums ?? this.config.includeChecksums;
    const signal = options.signal;
    const onProgress = options.onProgress;

    let buffer = Buffer.alloc(0);
    let chunkIndex = 0;
    let lastYieldedChunk: IEncryptedChunk | null = null;
    let tracker: ProgressTracker | undefined;
    const maxSingleChunk = 100 * 1024 * 1024;

    for await (const data of source) {
      if (signal?.aborted) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_EncryptionCancelled,
          ),
        );
      }

      if (data.length > maxSingleChunk) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_BufferOverflow,
          ),
        );
      }

      buffer = Buffer.concat([buffer, data]);

      if (!tracker && onProgress) {
        tracker = new ProgressTracker();
      }

      while (buffer.length >= chunkSize) {
        if (signal?.aborted) {
          throw new Error(
            this.engine.translate(
              NodeEciesComponentId,
              NodeEciesStringKey.Error_Stream_EncryptionCancelled,
            ),
          );
        }

        const chunkData = buffer.subarray(0, chunkSize);
        buffer = buffer.subarray(chunkSize);

        const encryptedChunk = await this.processor.encryptChunk(
          chunkData,
          publicKey,
          chunkIndex++,
          false,
          includeChecksums,
        );

        lastYieldedChunk = encryptedChunk;
        yield encryptedChunk;

        if (tracker && onProgress) {
          onProgress(tracker.update(chunkSize));
        }
      }
    }

    if (buffer.length > 0) {
      if (signal?.aborted) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_EncryptionCancelled,
          ),
        );
      }

      const encryptedChunk = await this.processor.encryptChunk(
        buffer,
        publicKey,
        chunkIndex,
        true,
        includeChecksums,
      );

      yield encryptedChunk;

      if (tracker && onProgress) {
        onProgress(tracker.update(buffer.length));
      }
    } else if (chunkIndex === 0) {
      return;
    } else if (lastYieldedChunk) {
      lastYieldedChunk.isLast = true;
    }
  }

  public async *encryptStreamMultiple(
    source: AsyncIterable<Buffer>,
    recipients: Array<{ id: Buffer; publicKey: Buffer }>,
    options: IEncryptStreamOptions = {},
  ): AsyncGenerator<IMultiRecipientChunk, void, unknown> {
    if (recipients.length === 0) {
      throw new Error(
        this.engine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_Stream_AtLeastOneRecipientRequired,
        ),
      );
    }
    if (recipients.length > 65535) {
      throw new Error(
        this.engine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_Stream_MaxRecipientsExceeded,
        ),
      );
    }

    for (const recipient of recipients) {
      if (
        !recipient.publicKey ||
        (recipient.publicKey.length !== 65 && recipient.publicKey.length !== 33)
      ) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_InvalidRecipientPublicKeyLength,
          ),
        );
      }
      if (
        !recipient.id ||
        recipient.id.length !==
          this.ecies.core.consts.MULTIPLE.RECIPIENT_ID_SIZE
      ) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_InvalidRecipientIdLength,
          ),
        );
      }
    }

    const chunkSize = options.chunkSize ?? this.config.chunkSize;
    const signal = options.signal;
    const onProgress = options.onProgress;

    const symmetricKey = Buffer.from(require('crypto').randomBytes(32));

    let buffer = Buffer.alloc(0);
    let chunkIndex = 0;
    let tracker: ProgressTracker | undefined;
    const maxSingleChunk = 100 * 1024 * 1024;

    for await (const data of source) {
      if (signal?.aborted) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_EncryptionCancelled,
          ),
        );
      }

      if (data.length > maxSingleChunk) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_BufferOverflow,
          ),
        );
      }

      buffer = Buffer.concat([buffer, data]);

      if (!tracker && onProgress) {
        tracker = new ProgressTracker();
      }

      while (buffer.length >= chunkSize) {
        if (signal?.aborted) {
          throw new Error(
            this.engine.translate(
              NodeEciesComponentId,
              NodeEciesStringKey.Error_Stream_EncryptionCancelled,
            ),
          );
        }

        const chunkData = buffer.subarray(0, chunkSize);
        buffer = buffer.subarray(chunkSize);

        const encryptedChunk = await this.multiRecipientProcessor.encryptChunk(
          chunkData,
          recipients,
          chunkIndex++,
          false,
          symmetricKey,
        );

        yield encryptedChunk;

        if (tracker && onProgress) {
          onProgress(tracker.update(chunkSize));
        }
      }
    }

    if (buffer.length > 0) {
      if (signal?.aborted) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_EncryptionCancelled,
          ),
        );
      }

      const encryptedChunk = await this.multiRecipientProcessor.encryptChunk(
        buffer,
        recipients,
        chunkIndex,
        true,
        symmetricKey,
      );

      yield encryptedChunk;

      if (tracker && onProgress) {
        onProgress(tracker.update(buffer.length));
      }
    }
  }

  public async *decryptStream(
    source: AsyncIterable<Buffer>,
    privateKey: Buffer,
    options: IDecryptStreamOptions = {},
  ): AsyncGenerator<Buffer, void, unknown> {
    if (!privateKey || privateKey.length !== 32) {
      throw new Error(
        this.engine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_Stream_InvalidPrivateKeyLength,
        ),
      );
    }

    const signal = options.signal;
    const onProgress = options.onProgress;
    let expectedIndex = 0;
    let tracker: ProgressTracker | undefined;

    if (onProgress) {
      tracker = new ProgressTracker();
    }

    for await (const chunkData of source) {
      if (signal?.aborted) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_DecryptionCancelled,
          ),
        );
      }

      const { data, header } = await this.processor.decryptChunk(
        chunkData,
        privateKey,
      );

      if (header.index !== expectedIndex) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_ChunkSequenceError,
          ),
        );
      }

      expectedIndex++;
      yield data;

      if (tracker && onProgress) {
        onProgress(tracker.update(data.length));
      }

      const isLast = (header.flags & 0x01) !== 0;
      if (isLast) {
        break;
      }
    }
  }

  public async *decryptStreamMultiple(
    source: AsyncIterable<Buffer>,
    recipientId: Buffer,
    privateKey: Buffer,
    options: IDecryptStreamOptions = {},
  ): AsyncGenerator<Buffer, void, unknown> {
    if (
      !recipientId ||
      recipientId.length !== this.ecies.core.consts.MULTIPLE.RECIPIENT_ID_SIZE
    ) {
      throw new Error(
        this.engine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_Stream_InvalidRecipientIdLength,
        ),
      );
    }
    if (!privateKey || privateKey.length !== 32) {
      throw new Error(
        this.engine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_Stream_InvalidPrivateKeyLength,
        ),
      );
    }

    const signal = options.signal;
    const onProgress = options.onProgress;
    let expectedIndex = 0;
    let tracker: ProgressTracker | undefined;

    if (onProgress) {
      tracker = new ProgressTracker();
    }

    for await (const chunkData of source) {
      if (signal?.aborted) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_DecryptionCancelled,
          ),
        );
      }

      const { data, header } = await this.multiRecipientProcessor.decryptChunk(
        chunkData,
        recipientId,
        privateKey,
      );

      if (header.chunkIndex !== expectedIndex) {
        throw new Error(
          this.engine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_Stream_ChunkSequenceError,
          ),
        );
      }

      expectedIndex++;
      yield data;

      if (tracker && onProgress) {
        onProgress(tracker.update(data.length));
      }

      const isLast = (header.flags & 0x01) !== 0;
      if (isLast) {
        break;
      }
    }
  }
}
