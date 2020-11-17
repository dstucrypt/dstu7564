const { computeHash } = require("./dstu7564.js");

function main2() {
  const buffer = Buffer.from(
    "000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F202122232425262728292A2B2C2D2E2F303132333435363738393A3B3C3D3E3F",
    "hex"
  );
  const expected = Buffer.from(
    "08F4EE6F1BE6903B324C4E27990CB24EF69DD58DBE84813EE0A52F6631239875",
    "hex"
  );
  const hash = computeHash(32, buffer);

  console.log("got", hash);
  console.log("expected", expected);
  console.log("OK?", hash.equals(expected));
}

function main3() {
  const buffer = Buffer.alloc(0);
  const expected = Buffer.from(
    "656b2f4cd71462388b64a37043ea55dbe445d452aecd46c3298343314ef04019bcfa3f04265a9857f91be91fce197096187ceda78c9c1c021c294a0689198538",
    "hex"
  );
  const hash = computeHash(64, buffer);

  console.log("got", hash.toString("hex"));
  console.log("expected", expected.toString("hex"));
  console.log("OK?", hash.equals(expected));
}

function main4() {
  const buffer = Buffer.from(
    "2d20726f6c65206469726563746f72206661696c757265206f6e206d697373696e672065647220636f64653b0a2d20706572662070726f66696c652063747820616e64206375727665206f626a65637420636f6e7465787420696e6974696c69736174696f6e3b0a2d206f757470757420756e636f6d70726573736564206b6579733b0a2d207368617265206b6579207061636b2f756e7061636b20616e6420776e6166206361636865206163726f737320646966666572656e74206b6579732028636f6e7374616e742074696d653f3f3f292e0a",
    "hex"
  );
  const expected = Buffer.from(
    "9398e9eb82463b9b33da1fb96dca35d1aff8a9d186dc3b801c1092c3715e4994",
    "hex"
  );
  const hash = computeHash(32, buffer);
  console.log("got", hash.toString("hex"));
  console.log("expected", expected.toString("hex"));
  console.log("OK?", hash.equals(expected));
}

main3();
main2();
main4();
