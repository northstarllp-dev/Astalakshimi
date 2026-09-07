import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Validates that a route param (or query, or body string) is a UUID.
 * Short-circuits junk traffic before it hits the DB.
 */
@Injectable()
export class UuidValidationPipe implements PipeTransform {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !UUID_RE.test(value)) {
      throw new BadRequestException('Invalid id format');
    }
    return value;
  }
}
