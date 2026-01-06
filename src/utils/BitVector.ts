import Long from "long";

export class BitVector {
  private chunks: Long[];
  public static readonly ADDRESS_SIZE_U64 = 16;

  constructor(chunks?: Long[] | number[]) {
    if (chunks) {
      if (chunks.length !== BitVector.ADDRESS_SIZE_U64) {
        throw new Error(
          `BitVector must have ${BitVector.ADDRESS_SIZE_U64} chunks`
        );
      }
      this.chunks = chunks.map((c) => Long.fromValue(c));
    } else {
      this.chunks = new Array(BitVector.ADDRESS_SIZE_U64).fill(Long.UZERO);
    }
  }

  static random(): BitVector {
    const chunks: Long[] = [];
    for (let i = 0; i < BitVector.ADDRESS_SIZE_U64; i++) {
      // Generate random 64-bit int.
      // random() returns [0, 1).
      const low = Math.floor(Math.random() * 0x100000000);
      const high = Math.floor(Math.random() * 0x100000000);
      chunks.push(new Long(low, high, true)); // unsigned
    }
    return new BitVector(chunks);
  }

  toList(): Long[] {
    return this.chunks;
  }

  hammingDistance(other: BitVector): number {
    let distance = 0;
    for (let i = 0; i < BitVector.ADDRESS_SIZE_U64; i++) {
      const xor = this.chunks[i].xor(other.chunks[i]);
      // Long stores values as signed 32-bit integers, but bitwise operations work on bits.
      // getLowBits() and getHighBits() return signed 32-bit integers.
      // We cast them to unsigned for bit counting logic if needed, but standard popcount works on bit pattern.
      distance +=
        this.popCount32(xor.getLowBits()) + this.popCount32(xor.getHighBits());
    }
    return distance;
  }

  // Hamming weight (population count) for 32-bit integer
  private popCount32(n: number): number {
    n = n - ((n >>> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
    return (((n + (n >>> 4)) & 0xf0f0f0f) * 0x1010101) >>> 24;
  }
}
