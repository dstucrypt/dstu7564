function uint8_to_uint64(in8) {
  const out64 = new BigUint64Array(in8.length / 8);
  const in8_len = in8.length;
  let idx64;
  let shift;
  for (let idx = 0; idx < in8_len; idx++) {
    idx64 = Math.floor(idx / 8);
    shift = (idx % 8) * 8;
    out64[idx64] = (BigInt(in8[idx]) << BigInt(shift)) | out64[idx64];
  }
  return out64;
}

function uint64_to_uint8(in64, in64_len, out8, out8_len) {
  for (let idx = 0; idx < in64_len; idx++) {
    out8[idx * 8] = Number(in64[idx] & BigInt(0xff));
    out8[idx * 8 + 1] = Number((in64[idx] >> BigInt(8 * 1)) & BigInt(0xff));
    out8[idx * 8 + 2] = Number((in64[idx] >> BigInt(8 * 2)) & BigInt(0xff));
    out8[idx * 8 + 3] = Number((in64[idx] >> BigInt(8 * 3)) & BigInt(0xff));
    out8[idx * 8 + 4] = Number((in64[idx] >> BigInt(8 * 4)) & BigInt(0xff));
    out8[idx * 8 + 5] = Number((in64[idx] >> BigInt(8 * 5)) & BigInt(0xff));
    out8[idx * 8 + 6] = Number((in64[idx] >> BigInt(8 * 6)) & BigInt(0xff));
    out8[idx * 8 + 7] = Number((in64[idx] >> BigInt(8 * 7)) & BigInt(0xff));
  }
}

module.exports = { uint8_to_uint64, uint64_to_uint8 };
