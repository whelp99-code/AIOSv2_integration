/**
 * Mail Value Objects
 * 메일 값 객체
 */

export class EmailAddress {
  constructor(
    public readonly address: string,
    public readonly name?: string
  ) {
    if (!this.isValid()) throw new Error(`Invalid email: ${address}`);
  }

  private isValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.address);
  }

  toString(): string {
    return this.name ? `${this.name} <${this.address}>` : this.address;
  }

  equals(other: EmailAddress): boolean {
    return this.address.toLowerCase() === other.address.toLowerCase();
  }
}

export class MailGroupKey {
  constructor(public readonly value: string) {}

  static fromSubject(subject: string): MailGroupKey {
    const normalized = subject
      .replace(/^(re:|fw:|fwd:)\s*/gi, '')
      .trim()
      .toLowerCase();
    return new MailGroupKey(normalized);
  }

  equals(other: MailGroupKey): boolean {
    return this.value === other.value;
  }
}
