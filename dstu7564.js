/*
 * Copyright (c) 2020 Illya Petrov <ilya.muromec@gmail.com>.
 * Original version in C.
 * Copyright (c) 2016 PrivatBank IT <acsk@privatbank.ua>. All rights reserved.
 * Redistribution and modifications are permitted subject to BSD license.
 */

const { uint8_to_uint64, uint64_to_uint8 } = require("./bufferUtil.js");
const subrowcol = require("./subrowcol.js").map(uint8_to_uint64);

const ROWS = 8;
const NB_512 = 8; /* Number of 8-byte words _in state for <=256-bit hash code. */
const NB_1024 = 16; /* Number of 8-byte words _in state for <=512-bit hash code. */
const STATE_BYTE_SIZE_512 = ROWS * NB_512;
const STATE_BYTE_SIZE_1024 = ROWS * NB_1024;
const NR_512 = 10; /*Number of rounds for 512-bit state.*/
const NR_1024 = 14; /* Number of rounds for 1024-bit state.*/
const REDUCTION_POLYNOMIAL = 0x11d; /* x^8 + x^4 + x^3 + x^2 + 1 */
const MAX_NUM_IN_BYTE = 256;
const MAX_BLOCK_LEN = 64;
const SBOX_LEN = 1024;

const BITS_IN_BYTE = 8;

function makeList(size, initFn) {
  const ret = [];
  while (ret.length < size) {
    ret.push(initFn());
  }
  return ret;
}

function table_G(ctx, _in, v1, v2, v3, v4, v5, v6, v7, v8) {
  return (
    ctx.p_boxrowcol[0][Number(v1 & BigInt(0xff))] ^
    ctx.p_boxrowcol[1][Number((v2 >> BigInt(8 * 1)) & BigInt(0xff))] ^
    ctx.p_boxrowcol[2][Number((v3 >> BigInt(8 * 2)) & BigInt(0xff))] ^
    ctx.p_boxrowcol[3][Number((v4 >> BigInt(8 * 3)) & BigInt(0xff))] ^
    ctx.p_boxrowcol[4][Number((v5 >> BigInt(8 * 4)) & BigInt(0xff))] ^
    ctx.p_boxrowcol[5][Number((v6 >> BigInt(8 * 5)) & BigInt(0xff))] ^
    ctx.p_boxrowcol[6][Number((v7 >> BigInt(8 * 6)) & BigInt(0xff))] ^
    ctx.p_boxrowcol[7][Number((v8 >> BigInt(8 * 7)) & BigInt(0xff))]
  );
}

function GALUA_MUL(i, j, k, shift) {
  return (
    multiply_galua(
      mds_matrix[j * ROWS + k],
      s_blocks[(k % 4) * MAX_NUM_IN_BYTE + i]
    ) << shift
  );
}

/*Matrix for m_col operation*/
// uint8
const mds_matrix = [
  0x01,
  0x01,
  0x05,
  0x01,
  0x08,
  0x06,
  0x07,
  0x04,
  0x04,
  0x01,
  0x01,
  0x05,
  0x01,
  0x08,
  0x06,
  0x07,
  0x07,
  0x04,
  0x01,
  0x01,
  0x05,
  0x01,
  0x08,
  0x06,
  0x06,
  0x07,
  0x04,
  0x01,
  0x01,
  0x05,
  0x01,
  0x08,
  0x08,
  0x06,
  0x07,
  0x04,
  0x01,
  0x01,
  0x05,
  0x01,
  0x01,
  0x08,
  0x06,
  0x07,
  0x04,
  0x01,
  0x01,
  0x05,
  0x05,
  0x01,
  0x08,
  0x06,
  0x07,
  0x04,
  0x01,
  0x01,
  0x01,
  0x05,
  0x01,
  0x08,
  0x06,
  0x07,
  0x04,
  0x01,
];
/*Константа для P раунда*/
const p_pconst = [
  [
    0x00,
    0x10,
    0x20,
    0x30,
    0x40,
    0x50,
    0x60,
    0x70,
    0x80,
    0x90,
    0xa0,
    0xb0,
    0xc0,
    0xd0,
    0xe0,
    0xf0,
  ],
  [
    0x01,
    0x11,
    0x21,
    0x31,
    0x41,
    0x51,
    0x61,
    0x71,
    0x81,
    0x91,
    0xa1,
    0xb1,
    0xc1,
    0xd1,
    0xe1,
    0xf1,
  ],
  [
    0x02,
    0x12,
    0x22,
    0x32,
    0x42,
    0x52,
    0x62,
    0x72,
    0x82,
    0x92,
    0xa2,
    0xb2,
    0xc2,
    0xd2,
    0xe2,
    0xf2,
  ],
  [
    0x03,
    0x13,
    0x23,
    0x33,
    0x43,
    0x53,
    0x63,
    0x73,
    0x83,
    0x93,
    0xa3,
    0xb3,
    0xc3,
    0xd3,
    0xe3,
    0xf3,
  ],
  [
    0x04,
    0x14,
    0x24,
    0x34,
    0x44,
    0x54,
    0x64,
    0x74,
    0x84,
    0x94,
    0xa4,
    0xb4,
    0xc4,
    0xd4,
    0xe4,
    0xf4,
  ],
  [
    0x05,
    0x15,
    0x25,
    0x35,
    0x45,
    0x55,
    0x65,
    0x75,
    0x85,
    0x95,
    0xa5,
    0xb5,
    0xc5,
    0xd5,
    0xe5,
    0xf5,
  ],
  [
    0x06,
    0x16,
    0x26,
    0x36,
    0x46,
    0x56,
    0x66,
    0x76,
    0x86,
    0x96,
    0xa6,
    0xb6,
    0xc6,
    0xd6,
    0xe6,
    0xf6,
  ],
  [
    0x07,
    0x17,
    0x27,
    0x37,
    0x47,
    0x57,
    0x67,
    0x77,
    0x87,
    0x97,
    0xa7,
    0xb7,
    0xc7,
    0xd7,
    0xe7,
    0xf7,
  ],
  [
    0x08,
    0x18,
    0x28,
    0x38,
    0x48,
    0x58,
    0x68,
    0x78,
    0x88,
    0x98,
    0xa8,
    0xb8,
    0xc8,
    0xd8,
    0xe8,
    0xf8,
  ],
  [
    0x09,
    0x19,
    0x29,
    0x39,
    0x49,
    0x59,
    0x69,
    0x79,
    0x89,
    0x99,
    0xa9,
    0xb9,
    0xc9,
    0xd9,
    0xe9,
    0xf9,
  ],
  [
    0x0a,
    0x1a,
    0x2a,
    0x3a,
    0x4a,
    0x5a,
    0x6a,
    0x7a,
    0x8a,
    0x9a,
    0xaa,
    0xba,
    0xca,
    0xda,
    0xea,
    0xfa,
  ],
  [
    0x0b,
    0x1b,
    0x2b,
    0x3b,
    0x4b,
    0x5b,
    0x6b,
    0x7b,
    0x8b,
    0x9b,
    0xab,
    0xbb,
    0xcb,
    0xdb,
    0xeb,
    0xfb,
  ],
  [
    0x0c,
    0x1c,
    0x2c,
    0x3c,
    0x4c,
    0x5c,
    0x6c,
    0x7c,
    0x8c,
    0x9c,
    0xac,
    0xbc,
    0xcc,
    0xdc,
    0xec,
    0xfc,
  ],
  [
    0x0d,
    0x1d,
    0x2d,
    0x3d,
    0x4d,
    0x5d,
    0x6d,
    0x7d,
    0x8d,
    0x9d,
    0xad,
    0xbd,
    0xcd,
    0xdd,
    0xed,
    0xfd,
  ],
];

/*Константа для Q раунда длинной блока 64 байта*/
const p_qconst_NB_512 = [
  Buffer.from(
    "F3F0F0F0F0F0F070F3F0F0F0F0F0F060F3F0F0F0F0F0F050F3F0F0F0F0F0F040F3F0F0F0F0F0F030F3F0F0F0F0F0F020F3F0F0F0F0F0F010F3F0F0F0F0F0F000",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F071F3F0F0F0F0F0F061F3F0F0F0F0F0F051F3F0F0F0F0F0F041F3F0F0F0F0F0F031F3F0F0F0F0F0F021F3F0F0F0F0F0F011F3F0F0F0F0F0F001",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F072F3F0F0F0F0F0F062F3F0F0F0F0F0F052F3F0F0F0F0F0F042F3F0F0F0F0F0F032F3F0F0F0F0F0F022F3F0F0F0F0F0F012F3F0F0F0F0F0F002",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F073F3F0F0F0F0F0F063F3F0F0F0F0F0F053F3F0F0F0F0F0F043F3F0F0F0F0F0F033F3F0F0F0F0F0F023F3F0F0F0F0F0F013F3F0F0F0F0F0F003",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F074F3F0F0F0F0F0F064F3F0F0F0F0F0F054F3F0F0F0F0F0F044F3F0F0F0F0F0F034F3F0F0F0F0F0F024F3F0F0F0F0F0F014F3F0F0F0F0F0F004",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F075F3F0F0F0F0F0F065F3F0F0F0F0F0F055F3F0F0F0F0F0F045F3F0F0F0F0F0F035F3F0F0F0F0F0F025F3F0F0F0F0F0F015F3F0F0F0F0F0F005",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F076F3F0F0F0F0F0F066F3F0F0F0F0F0F056F3F0F0F0F0F0F046F3F0F0F0F0F0F036F3F0F0F0F0F0F026F3F0F0F0F0F0F016F3F0F0F0F0F0F006",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F077F3F0F0F0F0F0F067F3F0F0F0F0F0F057F3F0F0F0F0F0F047F3F0F0F0F0F0F037F3F0F0F0F0F0F027F3F0F0F0F0F0F017F3F0F0F0F0F0F007",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F078F3F0F0F0F0F0F068F3F0F0F0F0F0F058F3F0F0F0F0F0F048F3F0F0F0F0F0F038F3F0F0F0F0F0F028F3F0F0F0F0F0F018F3F0F0F0F0F0F008",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F079F3F0F0F0F0F0F069F3F0F0F0F0F0F059F3F0F0F0F0F0F049F3F0F0F0F0F0F039F3F0F0F0F0F0F029F3F0F0F0F0F0F019F3F0F0F0F0F0F009",
    "hex"
  ),
].map(uint8_to_uint64);

/*Константа для Q раунда длинной блока 128 байт*/
const p_qconst_NB_1024 = [
  Buffer.from(
    "F3F0F0F0F0F0F0F0F3F0F0F0F0F0F0E0F3F0F0F0F0F0F0D0F3F0F0F0F0F0F0C0F3F0F0F0F0F0F0B0F3F0F0F0F0F0F0A0F3F0F0F0F0F0F090F3F0F0F0F0F0F080F3F0F0F0F0F0F070F3F0F0F0F0F0F060F3F0F0F0F0F0F050F3F0F0F0F0F0F040F3F0F0F0F0F0F030F3F0F0F0F0F0F020F3F0F0F0F0F0F010F3F0F0F0F0F0F000",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0F1F3F0F0F0F0F0F0E1F3F0F0F0F0F0F0D1F3F0F0F0F0F0F0C1F3F0F0F0F0F0F0B1F3F0F0F0F0F0F0A1F3F0F0F0F0F0F091F3F0F0F0F0F0F081F3F0F0F0F0F0F071F3F0F0F0F0F0F061F3F0F0F0F0F0F051F3F0F0F0F0F0F041F3F0F0F0F0F0F031F3F0F0F0F0F0F021F3F0F0F0F0F0F011F3F0F0F0F0F0F001",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0F2F3F0F0F0F0F0F0E2F3F0F0F0F0F0F0D2F3F0F0F0F0F0F0C2F3F0F0F0F0F0F0B2F3F0F0F0F0F0F0A2F3F0F0F0F0F0F092F3F0F0F0F0F0F082F3F0F0F0F0F0F072F3F0F0F0F0F0F062F3F0F0F0F0F0F052F3F0F0F0F0F0F042F3F0F0F0F0F0F032F3F0F0F0F0F0F022F3F0F0F0F0F0F012F3F0F0F0F0F0F002",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0F3F3F0F0F0F0F0F0E3F3F0F0F0F0F0F0D3F3F0F0F0F0F0F0C3F3F0F0F0F0F0F0B3F3F0F0F0F0F0F0A3F3F0F0F0F0F0F093F3F0F0F0F0F0F083F3F0F0F0F0F0F073F3F0F0F0F0F0F063F3F0F0F0F0F0F053F3F0F0F0F0F0F043F3F0F0F0F0F0F033F3F0F0F0F0F0F023F3F0F0F0F0F0F013F3F0F0F0F0F0F003",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0F4F3F0F0F0F0F0F0E4F3F0F0F0F0F0F0D4F3F0F0F0F0F0F0C4F3F0F0F0F0F0F0B4F3F0F0F0F0F0F0A4F3F0F0F0F0F0F094F3F0F0F0F0F0F084F3F0F0F0F0F0F074F3F0F0F0F0F0F064F3F0F0F0F0F0F054F3F0F0F0F0F0F044F3F0F0F0F0F0F034F3F0F0F0F0F0F024F3F0F0F0F0F0F014F3F0F0F0F0F0F004",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0F5F3F0F0F0F0F0F0E5F3F0F0F0F0F0F0D5F3F0F0F0F0F0F0C5F3F0F0F0F0F0F0B5F3F0F0F0F0F0F0A5F3F0F0F0F0F0F095F3F0F0F0F0F0F085F3F0F0F0F0F0F075F3F0F0F0F0F0F065F3F0F0F0F0F0F055F3F0F0F0F0F0F045F3F0F0F0F0F0F035F3F0F0F0F0F0F025F3F0F0F0F0F0F015F3F0F0F0F0F0F005",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0F6F3F0F0F0F0F0F0E6F3F0F0F0F0F0F0D6F3F0F0F0F0F0F0C6F3F0F0F0F0F0F0B6F3F0F0F0F0F0F0A6F3F0F0F0F0F0F096F3F0F0F0F0F0F086F3F0F0F0F0F0F076F3F0F0F0F0F0F066F3F0F0F0F0F0F056F3F0F0F0F0F0F046F3F0F0F0F0F0F036F3F0F0F0F0F0F026F3F0F0F0F0F0F016F3F0F0F0F0F0F006",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0F7F3F0F0F0F0F0F0E7F3F0F0F0F0F0F0D7F3F0F0F0F0F0F0C7F3F0F0F0F0F0F0B7F3F0F0F0F0F0F0A7F3F0F0F0F0F0F097F3F0F0F0F0F0F087F3F0F0F0F0F0F077F3F0F0F0F0F0F067F3F0F0F0F0F0F057F3F0F0F0F0F0F047F3F0F0F0F0F0F037F3F0F0F0F0F0F027F3F0F0F0F0F0F017F3F0F0F0F0F0F007",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0F8F3F0F0F0F0F0F0E8F3F0F0F0F0F0F0D8F3F0F0F0F0F0F0C8F3F0F0F0F0F0F0B8F3F0F0F0F0F0F0A8F3F0F0F0F0F0F098F3F0F0F0F0F0F088F3F0F0F0F0F0F078F3F0F0F0F0F0F068F3F0F0F0F0F0F058F3F0F0F0F0F0F048F3F0F0F0F0F0F038F3F0F0F0F0F0F028F3F0F0F0F0F0F018F3F0F0F0F0F0F008",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0F9F3F0F0F0F0F0F0E9F3F0F0F0F0F0F0D9F3F0F0F0F0F0F0C9F3F0F0F0F0F0F0B9F3F0F0F0F0F0F0A9F3F0F0F0F0F0F099F3F0F0F0F0F0F089F3F0F0F0F0F0F079F3F0F0F0F0F0F069F3F0F0F0F0F0F059F3F0F0F0F0F0F049F3F0F0F0F0F0F039F3F0F0F0F0F0F029F3F0F0F0F0F0F019F3F0F0F0F0F0F009",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0FAF3F0F0F0F0F0F0EAF3F0F0F0F0F0F0DAF3F0F0F0F0F0F0CAF3F0F0F0F0F0F0BAF3F0F0F0F0F0F0AAF3F0F0F0F0F0F09AF3F0F0F0F0F0F08AF3F0F0F0F0F0F07AF3F0F0F0F0F0F06AF3F0F0F0F0F0F05AF3F0F0F0F0F0F04AF3F0F0F0F0F0F03AF3F0F0F0F0F0F02AF3F0F0F0F0F0F01AF3F0F0F0F0F0F00A",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0FBF3F0F0F0F0F0F0EBF3F0F0F0F0F0F0DBF3F0F0F0F0F0F0CBF3F0F0F0F0F0F0BBF3F0F0F0F0F0F0ABF3F0F0F0F0F0F09BF3F0F0F0F0F0F08BF3F0F0F0F0F0F07BF3F0F0F0F0F0F06BF3F0F0F0F0F0F05BF3F0F0F0F0F0F04BF3F0F0F0F0F0F03BF3F0F0F0F0F0F02BF3F0F0F0F0F0F01BF3F0F0F0F0F0F00B",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0FCF3F0F0F0F0F0F0ECF3F0F0F0F0F0F0DCF3F0F0F0F0F0F0CCF3F0F0F0F0F0F0BCF3F0F0F0F0F0F0ACF3F0F0F0F0F0F09CF3F0F0F0F0F0F08CF3F0F0F0F0F0F07CF3F0F0F0F0F0F06CF3F0F0F0F0F0F05CF3F0F0F0F0F0F04CF3F0F0F0F0F0F03CF3F0F0F0F0F0F02CF3F0F0F0F0F0F01CF3F0F0F0F0F0F00C",
    "hex"
  ),
  Buffer.from(
    "F3F0F0F0F0F0F0FDF3F0F0F0F0F0F0EDF3F0F0F0F0F0F0DDF3F0F0F0F0F0F0CDF3F0F0F0F0F0F0BDF3F0F0F0F0F0F0ADF3F0F0F0F0F0F09DF3F0F0F0F0F0F08DF3F0F0F0F0F0F07DF3F0F0F0F0F0F06DF3F0F0F0F0F0F05DF3F0F0F0F0F0F04DF3F0F0F0F0F0F03DF3F0F0F0F0F0F02DF3F0F0F0F0F0F01DF3F0F0F0F0F0F00D",
    "hex"
  ),
].map(uint8_to_uint64);

function mod(num, divisor) {
  return ((num % divisor) + divisor) % divisor;
}

function padding(buf, buf_len_out, buf_len_out_bit, nbytes) {
  let zero_nbytes;
  let cur_pos;
  let i;

  cur_pos = buf_len_out % nbytes;
  zero_nbytes = mod(-buf_len_out_bit - 97, nbytes << 3) >>> 3;

  buf[cur_pos] = 0x80;
  cur_pos++;
  buf.fill(0, cur_pos, zero_nbytes);
  cur_pos += zero_nbytes;

  for (i = 0; i < 96 >> 3; ++i, ++cur_pos) {
    if (i < 4) {
      buf[cur_pos] = (buf_len_out_bit >> (i << 3)) & 0xff;
    } else {
      buf[cur_pos] = 0;
    }
  }
}

/*Russian peasant multiplication algorithm*/
function multiply_galua(x, y) {
  var i;
  var r = 0;
  var hbit;

  for (i = 0; i < BITS_IN_BYTE; ++i) {
    if ((y & 0x1) == 1) {
      r ^= x;
    }
    hbit = uint8_t(x & 0x80);
    x <<= 1;
    if (hbit == 0x80) {
      x ^= REDUCTION_POLYNOMIAL;
    }
    y >>= 1;
  }

  return r;
}

/*Precompute sbox and srow operations*/
function p_sub_row_col(s_blocks, p_boxrowcol, mds_matrix) {
  let i, k;

  for (k = 0; k < ROWS; k++) {
    for (i = 0; i < MAX_NUM_IN_BYTE; i++) {
      p_boxrowcol[k][i] =
        GALUA_MUL(i, 0, k, 0) ^
        GALUA_MUL(i, 1, k, 8) ^
        GALUA_MUL(i, 2, k, 16) ^
        GALUA_MUL(i, 3, k, 24) ^
        GALUA_MUL(i, 4, k, 32) ^
        GALUA_MUL(i, 5, k, 40) ^
        GALUA_MUL(i, 6, k, 48) ^
        GALUA_MUL(i, 7, k, 56);
    }
  }
}

function kupyna_G_xor(ctx, _in, out, i) {
  if (ctx.columns == NB_512) {
    let i0 = _in[0];
    let i1 = _in[1];
    let i2 = _in[2];
    let i3 = _in[3];
    let i4 = _in[4];
    let i5 = _in[5];
    let i6 = _in[6];
    let i7 = _in[7];
    i0 ^= BigInt(p_pconst[i][0]);
    i1 ^= BigInt(p_pconst[i][1]);
    i2 ^= BigInt(p_pconst[i][2]);
    i3 ^= BigInt(p_pconst[i][3]);
    i4 ^= BigInt(p_pconst[i][4]);
    i5 ^= BigInt(p_pconst[i][5]);
    i6 ^= BigInt(p_pconst[i][6]);
    i7 ^= BigInt(p_pconst[i][7]);
    out[0] = table_G(ctx, _in, i0, i7, i6, i5, i4, i3, i2, i1);
    out[1] = table_G(ctx, _in, i1, i0, i7, i6, i5, i4, i3, i2);
    out[2] = table_G(ctx, _in, i2, i1, i0, i7, i6, i5, i4, i3);
    out[3] = table_G(ctx, _in, i3, i2, i1, i0, i7, i6, i5, i4);
    out[4] = table_G(ctx, _in, i4, i3, i2, i1, i0, i7, i6, i5);
    out[5] = table_G(ctx, _in, i5, i4, i3, i2, i1, i0, i7, i6);
    out[6] = table_G(ctx, _in, i6, i5, i4, i3, i2, i1, i0, i7);
    out[7] = table_G(ctx, _in, i7, i6, i5, i4, i3, i2, i1, i0);
  } else {
    let i0 = _in[0];
    let i1 = _in[1];
    let i2 = _in[2];
    let i3 = _in[3];
    let i4 = _in[4];
    let i5 = _in[5];
    let i6 = _in[6];
    let i7 = _in[7];
    let i8 = _in[8];
    let i9 = _in[9];
    let i10 = _in[10];
    let i11 = _in[11];
    let i12 = _in[12];
    let i13 = _in[13];
    let i14 = _in[14];
    let i15 = _in[15];
    i0 ^= BigInt(p_pconst[i][0]);
    i1 ^= BigInt(p_pconst[i][1]);
    i2 ^= BigInt(p_pconst[i][2]);
    i3 ^= BigInt(p_pconst[i][3]);
    i4 ^= BigInt(p_pconst[i][4]);
    i5 ^= BigInt(p_pconst[i][5]);
    i6 ^= BigInt(p_pconst[i][6]);
    i7 ^= BigInt(p_pconst[i][7]);
    i8 ^= BigInt(p_pconst[i][8]);
    i9 ^= BigInt(p_pconst[i][9]);
    i10 ^= BigInt(p_pconst[i][10]);
    i11 ^= BigInt(p_pconst[i][11]);
    i12 ^= BigInt(p_pconst[i][12]);
    i13 ^= BigInt(p_pconst[i][13]);
    i14 ^= BigInt(p_pconst[i][14]);
    i15 ^= BigInt(p_pconst[i][15]);
    out[0] = table_G(ctx, _in, i0, i15, i14, i13, i12, i11, i10, i5);
    out[1] = table_G(ctx, _in, i1, i0, i15, i14, i13, i12, i11, i6);
    out[2] = table_G(ctx, _in, i2, i1, i0, i15, i14, i13, i12, i7);
    out[3] = table_G(ctx, _in, i3, i2, i1, i0, i15, i14, i13, i8);
    out[4] = table_G(ctx, _in, i4, i3, i2, i1, i0, i15, i14, i9);
    out[5] = table_G(ctx, _in, i5, i4, i3, i2, i1, i0, i15, i10);
    out[6] = table_G(ctx, _in, i6, i5, i4, i3, i2, i1, i0, i11);
    out[7] = table_G(ctx, _in, i7, i6, i5, i4, i3, i2, i1, i12);
    out[8] = table_G(ctx, _in, i8, i7, i6, i5, i4, i3, i2, i13);
    out[9] = table_G(ctx, _in, i9, i8, i7, i6, i5, i4, i3, i14);
    out[10] = table_G(ctx, _in, i10, i9, i8, i7, i6, i5, i4, i15);
    out[11] = table_G(ctx, _in, i11, i10, i9, i8, i7, i6, i5, i0);
    out[12] = table_G(ctx, _in, i12, i11, i10, i9, i8, i7, i6, i1);
    out[13] = table_G(ctx, _in, i13, i12, i11, i10, i9, i8, i7, i2);
    out[14] = table_G(ctx, _in, i14, i13, i12, i11, i10, i9, i8, i3);
    out[15] = table_G(ctx, _in, i15, i14, i13, i12, i11, i10, i9, i4);
  }
}

function kupyna_G_add(ctx, _in, out, i) {
  if (ctx.columns == NB_512) {
    let i0 = _in[0];
    let i1 = _in[1];
    let i2 = _in[2];
    let i3 = _in[3];
    let i4 = _in[4];
    let i5 = _in[5];
    let i6 = _in[6];
    let i7 = _in[7];
    i0 += BigInt(p_qconst_NB_512[i][0]);
    i1 += BigInt(p_qconst_NB_512[i][1]);
    i2 += BigInt(p_qconst_NB_512[i][2]);
    i3 += BigInt(p_qconst_NB_512[i][3]);
    i4 += BigInt(p_qconst_NB_512[i][4]);
    i5 += BigInt(p_qconst_NB_512[i][5]);
    i6 += BigInt(p_qconst_NB_512[i][6]);
    i7 += BigInt(p_qconst_NB_512[i][7]);
    out[0] = table_G(ctx, _in, i0, i7, i6, i5, i4, i3, i2, i1);
    out[1] = table_G(ctx, _in, i1, i0, i7, i6, i5, i4, i3, i2);
    out[2] = table_G(ctx, _in, i2, i1, i0, i7, i6, i5, i4, i3);
    out[3] = table_G(ctx, _in, i3, i2, i1, i0, i7, i6, i5, i4);
    out[4] = table_G(ctx, _in, i4, i3, i2, i1, i0, i7, i6, i5);
    out[5] = table_G(ctx, _in, i5, i4, i3, i2, i1, i0, i7, i6);
    out[6] = table_G(ctx, _in, i6, i5, i4, i3, i2, i1, i0, i7);
    out[7] = table_G(ctx, _in, i7, i6, i5, i4, i3, i2, i1, i0);
  } else {
    let i0 = _in[0];
    let i1 = _in[1];
    let i2 = _in[2];
    let i3 = _in[3];
    let i4 = _in[4];
    let i5 = _in[5];
    let i6 = _in[6];
    let i7 = _in[7];
    let i8 = _in[8];
    let i9 = _in[9];
    let i10 = _in[10];
    let i11 = _in[11];
    let i12 = _in[12];
    let i13 = _in[13];
    let i14 = _in[14];
    let i15 = _in[15];
    i0 += BigInt(p_qconst_NB_1024[i][0]);
    i1 += BigInt(p_qconst_NB_1024[i][1]);
    i2 += BigInt(p_qconst_NB_1024[i][2]);
    i3 += BigInt(p_qconst_NB_1024[i][3]);
    i4 += BigInt(p_qconst_NB_1024[i][4]);
    i5 += BigInt(p_qconst_NB_1024[i][5]);
    i6 += BigInt(p_qconst_NB_1024[i][6]);
    i7 += BigInt(p_qconst_NB_1024[i][7]);
    i8 += BigInt(p_qconst_NB_1024[i][8]);
    i9 += BigInt(p_qconst_NB_1024[i][9]);
    i10 += BigInt(p_qconst_NB_1024[i][10]);
    i11 += BigInt(p_qconst_NB_1024[i][11]);
    i12 += BigInt(p_qconst_NB_1024[i][12]);
    i13 += BigInt(p_qconst_NB_1024[i][13]);
    i14 += BigInt(p_qconst_NB_1024[i][14]);
    i15 += BigInt(p_qconst_NB_1024[i][15]);
    out[0] = table_G(ctx, _in, i0, i15, i14, i13, i12, i11, i10, i5);
    out[1] = table_G(ctx, _in, i1, i0, i15, i14, i13, i12, i11, i6);
    out[2] = table_G(ctx, _in, i2, i1, i0, i15, i14, i13, i12, i7);
    out[3] = table_G(ctx, _in, i3, i2, i1, i0, i15, i14, i13, i8);
    out[4] = table_G(ctx, _in, i4, i3, i2, i1, i0, i15, i14, i9);
    out[5] = table_G(ctx, _in, i5, i4, i3, i2, i1, i0, i15, i10);
    out[6] = table_G(ctx, _in, i6, i5, i4, i3, i2, i1, i0, i11);
    out[7] = table_G(ctx, _in, i7, i6, i5, i4, i3, i2, i1, i12);
    out[8] = table_G(ctx, _in, i8, i7, i6, i5, i4, i3, i2, i13);
    out[9] = table_G(ctx, _in, i9, i8, i7, i6, i5, i4, i3, i14);
    out[10] = table_G(ctx, _in, i10, i9, i8, i7, i6, i5, i4, i15);
    out[11] = table_G(ctx, _in, i11, i10, i9, i8, i7, i6, i5, i0);
    out[12] = table_G(ctx, _in, i12, i11, i10, i9, i8, i7, i6, i1);
    out[13] = table_G(ctx, _in, i13, i12, i11, i10, i9, i8, i7, i2);
    out[14] = table_G(ctx, _in, i14, i13, i12, i11, i10, i9, i8, i3);
    out[15] = table_G(ctx, _in, i15, i14, i13, i12, i11, i10, i9, i4);
  }
}

function P(ctx, state_) {
  const block_len = ctx.columns << 3;
  const state = uint8_to_uint64(state_.slice(0, block_len));
  const s = new BigUint64Array(NB_1024);

  kupyna_G_xor(ctx, state, s, 0);
  kupyna_G_xor(ctx, s, state, 1);
  kupyna_G_xor(ctx, state, s, 2);
  kupyna_G_xor(ctx, s, state, 3);
  kupyna_G_xor(ctx, state, s, 4);
  kupyna_G_xor(ctx, s, state, 5);
  kupyna_G_xor(ctx, state, s, 6);
  kupyna_G_xor(ctx, s, state, 7);
  kupyna_G_xor(ctx, state, s, 8);
  kupyna_G_xor(ctx, s, state, 9);
  if (ctx.columns == NB_1024) {
    kupyna_G_xor(ctx, state, s, 10);
    kupyna_G_xor(ctx, s, state, 11);
    kupyna_G_xor(ctx, state, s, 12);
    kupyna_G_xor(ctx, s, state, 13);
  }

  uint64_to_uint8(state, ctx.columns, state_, block_len);
}

function Q(ctx, state_) {
  const s = new BigUint64Array(NB_1024);
  let block_len;
  let debug = Buffer.alloc(NB_1024 * ROWS);

  block_len = ctx.columns << 3;
  const state = uint8_to_uint64(state_);

  kupyna_G_add(ctx, state, s, 0);

  kupyna_G_add(ctx, s, state, 1);
  kupyna_G_add(ctx, state, s, 2);
  kupyna_G_add(ctx, s, state, 3);
  kupyna_G_add(ctx, state, s, 4);
  kupyna_G_add(ctx, s, state, 5);
  kupyna_G_add(ctx, state, s, 6);
  kupyna_G_add(ctx, s, state, 7);
  kupyna_G_add(ctx, state, s, 8);
  kupyna_G_add(ctx, s, state, 9);
  if (ctx.columns == NB_1024) {
    kupyna_G_add(ctx, state, s, 10);
    kupyna_G_add(ctx, s, state, 11);
    kupyna_G_add(ctx, state, s, 12);
    kupyna_G_add(ctx, s, state, 13);
  }

  uint64_to_uint8(state, ctx.columns, state_, block_len);
}

function dstu7564_xor(arg1, arg2, out, columns) {
  const limit =
    columns === NB_1024 ? STATE_BYTE_SIZE_1024 : STATE_BYTE_SIZE_512;
  for (let idx = 0; idx < limit; idx++) {
    out[idx] = arg1[idx] ^ arg2[idx];
  }
}

function digest(ctx, data) {
  let temp1 = Buffer.alloc(NB_1024 * ROWS);
  let temp2 = Buffer.alloc(NB_1024 * ROWS);

  data.copy(temp2, 0, 0, ctx.columns << 3);
  dstu7564_xor(ctx.state, data, temp1, ctx.columns);
  P(ctx, temp1);
  Q(ctx, temp2);

  dstu7564_xor(temp1, temp2, temp2, ctx.columns);
  dstu7564_xor(ctx.state, temp2, ctx.state, ctx.columns);
}

function output_transformation(ctx, hash) {
  let temp = Buffer.alloc(NB_1024 * ROWS);
  let ret = 0;

  ctx.state.copy(temp, 0, 0, ROWS * NB_1024);

  P(ctx, temp);

  dstu7564_xor(ctx.state, temp, ctx.state, ctx.columns);

  ctx.state.copy(hash, 0, ctx.nbytes - ctx.hash_nbytes, ctx.nbytes);
  dstu7564_init(ctx, ctx.hash_nbytes);

  return ret;
}

function dstu7564_alloc(sbox_id) {
  // Dstu7564Ctx
  const ctx = {
    state: Buffer.alloc(NB_1024 * ROWS),
    p_boxrowcol: makeList(ROWS, () => new BigUint64Array(MAX_NUM_IN_BYTE)),
    last_block: Buffer.alloc(STATE_BYTE_SIZE_1024 * 2),
    is_inited: false,
  };

  if (sbox_id === 0) {
    for (let i = 0; i < subrowcol.length; i++) {
      for (let j = 0; j < subrowcol[i].length; j++) {
        ctx.p_boxrowcol[i][j] = subrowcol[i][j];
      }
    }
  } else {
    throw new Error("Wrong sbox id");
  }

  return ctx;
}

function CHECK_PARAM(param) {
  if (!param) {
    throw new Error("param is expected to be set");
  }
}

function SET_ERROR(code) {
  throw new Error("Code " + code);
}

function dstu7564_init(ctx, hash_nbytes) {
  CHECK_PARAM(ctx);
  CHECK_PARAM((hash_nbytes > 0) & (hash_nbytes <= 64));

  if (hash_nbytes <= 32) {
    ctx.rounds = NR_512;
    ctx.columns = NB_512;
    ctx.nbytes = STATE_BYTE_SIZE_512;
    ctx.state.fill(0, 0, STATE_BYTE_SIZE_512);
    ctx.state[0] = STATE_BYTE_SIZE_512;
  } else {
    ctx.rounds = NR_1024;
    ctx.columns = NB_1024;
    ctx.nbytes = STATE_BYTE_SIZE_1024;
    ctx.state.fill(0, 0, STATE_BYTE_SIZE_1024);
    ctx.state[0] = STATE_BYTE_SIZE_1024;
  }
  ctx.hash_nbytes = hash_nbytes;

  ctx.last_block_el = 0;
  ctx.msg_tot_len = 0;
  ctx.is_inited = true;
}

function dstu7564_update(ctx, data_buf, data_buf_len) {
  let block_size;

  CHECK_PARAM(ctx);
  CHECK_PARAM(data_buf);
  CHECK_PARAM(data_buf_len >= 0);

  if (ctx.is_inited == false) {
    SET_ERROR(-1);
  }

  block_size = ctx.nbytes;

  ctx.msg_tot_len += data_buf_len << 3;
  if (ctx.last_block_el + data_buf_len < block_size) {
    data_buf.copy(ctx.last_block, ctx.last_block_el, 0, data_buf_len);
    ctx.last_block_el += data_buf_len;
    return true;
  }

  data_buf.copy(
    ctx.last_block,
    ctx.last_block_el,
    0,
    block_size - ctx.last_block_el
  );
  digest(ctx, ctx.last_block);
  ctx.last_block.fill(0, 0, MAX_BLOCK_LEN);

  let shift = block_size - ctx.last_block_el;
  data_buf_len -= block_size - ctx.last_block_el;
  let i;
  for (i = 0; i + block_size <= data_buf_len; i += block_size) {
    digest(ctx, data_buf.slice(shift + i));
  }

  ctx.last_block_el = data_buf_len - i;
  if (ctx.last_block_el != 0) {
    data_buf.copy(ctx.last_block, 0, shift + i, shift + i + ctx.last_block_el);
  }
}

function dstu7564_final(ctx, hash) {
  CHECK_PARAM(ctx);
  CHECK_PARAM(hash);
  if (ctx.is_inited == false) {
    SET_ERROR(-1);
  }

  padding(ctx.last_block, ctx.last_block_el, ctx.msg_tot_len, ctx.nbytes);
  digest(ctx, ctx.last_block);
  output_transformation(ctx, hash);
}

function computeHash(size, buffer) {
  const hash = Buffer.alloc(size);
  const ctx = dstu7564_alloc(0);
  dstu7564_init(ctx, size);
  dstu7564_update(ctx, buffer, buffer.length);
  dstu7564_final(ctx, hash);
  return hash;
}
module.exports = {
  computeHash,
  dstu7564_alloc,
  dstu7564_init,
  dstu7564_update,
  dstu7564_final,
};
