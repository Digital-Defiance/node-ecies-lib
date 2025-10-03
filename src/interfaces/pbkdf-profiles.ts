import { IPbkdf2Config } from '@digitaldefiance/ecies-lib';
import { Pbkdf2ProfileEnum } from '../enumerations/pbkdf2-profile';

export type PbkdfProfiles = {
  [key in Pbkdf2ProfileEnum]: IPbkdf2Config;
};
