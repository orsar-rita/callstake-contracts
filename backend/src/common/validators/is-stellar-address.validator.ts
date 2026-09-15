import { registerDecorator, ValidationOptions } from 'class-validator';
import { StrKey } from '@stellar/stellar-sdk';

/** Validates a Stellar ed25519 public key (G...) — the account identity used everywhere in this backend. */
export function IsStellarAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStellarAddress',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && StrKey.isValidEd25519PublicKey(value);
        },
        defaultMessage(): string {
          return '$property must be a valid Stellar account address (G...)';
        },
      },
    });
  };
}
