import { registerDecorator, ValidationOptions } from 'class-validator';
import { StrKey } from '@stellar/stellar-sdk';

/** Validates a Soroban contract address (C...), as opposed to an account address (G...). */
export function IsContractAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isContractAddress',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && StrKey.isValidContract(value);
        },
        defaultMessage(): string {
          return '$property must be a valid Soroban contract address (C...)';
        },
      },
    });
  };
}
