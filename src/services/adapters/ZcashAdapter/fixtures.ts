/**
 * Trimmed Zebra responses from Zcash mainnet block 3,483,400. Scripts, proofs and ciphertexts
 * are stripped; every value the explorer reads is unchanged.
 */

import type { ZcashRawBlock, ZcashRawTransaction } from "./utils";

export const COINBASE_TX: ZcashRawTransaction = {
  txid: "fb24341c1e2462111af99701034b4749d3e1cb6f7d5c640a3895c3b80ab18731",
  version: 6,
  versiongroupid: "d884b698",
  locktime: 0,
  expiryheight: 3483400,
  size: 181,
  height: 3483400,
  confirmations: 66,
  time: 1789411472,
  blocktime: 1789411472,
  blockhash: "00000000005cba2d18fb12ef13dc7245eccb5708a590ceaad47ff76fc7fc2af3",
  valueBalance: 0.0,
  valueBalanceZat: 0,
  vin: [
    {
      coinbase:
        "0308273504f09fa693049040a86a466f756e647279205a6361736820506f6f6c2023507269766163794d617474657273",
      sequence: 4294967295,
    },
  ],
  vout: [
    {
      value: 1.25490751,
      valueZat: 125490751,
      n: 0,
      scriptPubKey: {
        type: "pubkeyhash",
        addresses: ["t1SqwRAAdSig6dE4EBPLonAait219VmkUjP"],
      },
    },
    {
      value: 0.125,
      valueZat: 12500000,
      n: 1,
      scriptPubKey: {
        type: "scripthash",
        addresses: ["t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow"],
      },
    },
  ],
  vShieldedSpend: [],
  vShieldedOutput: [],
  vjoinsplit: [],
  orchard: {
    valueBalance: 0.0,
    valueBalanceZat: 0,
    actions: [],
  },
};

// Ironwood only: empty vin and vout, fee 10,000 zat
export const IRONWOOD_ONLY_TX: ZcashRawTransaction = {
  txid: "36a167f602a15015593130974e0942179e7e394e0e0e6e239752533e2b5ce2e3",
  version: 6,
  versiongroupid: "d884b698",
  locktime: 0,
  expiryheight: 3483438,
  size: 9166,
  height: 3483400,
  confirmations: 66,
  time: 1789411472,
  blocktime: 1789411472,
  blockhash: "00000000005cba2d18fb12ef13dc7245eccb5708a590ceaad47ff76fc7fc2af3",
  valueBalance: 0.0,
  valueBalanceZat: 0,
  vin: [],
  vout: [],
  vShieldedSpend: [],
  vShieldedOutput: [],
  vjoinsplit: [],
  orchard: {
    valueBalance: 0.0,
    valueBalanceZat: 0,
    actions: [],
  },
  ironwood: {
    valueBalance: 0.0001,
    valueBalanceZat: 10000,
    actions: [
      {
        nullifier: "8b0699aa83c550f0",
        cmx: "1799a87705a8e412",
      },
      {
        nullifier: "5b6ce4d4da7dc886",
        cmx: "7d1721e30df6e182",
      },
    ],
  },
};

// 15 transparent inputs shielded into 2 Sapling outputs
export const SHIELDING_TX: ZcashRawTransaction = {
  txid: "717b54c39d4cf2d40cdaabd783117c4b2d644287a3bf824b70b254a51e2c361d",
  version: 4,
  versiongroupid: "892f2085",
  locktime: 0,
  expiryheight: 3483440,
  size: 4202,
  height: 3483400,
  confirmations: 66,
  time: 1789411472,
  blocktime: 1789411472,
  blockhash: "00000000005cba2d18fb12ef13dc7245eccb5708a590ceaad47ff76fc7fc2af3",
  valueBalance: -18.77663138,
  valueBalanceZat: -1877663138,
  vin: [
    {
      txid: "d49bb002c3dca980499a02f5e099f0eddf5c8e210ed400147c1d886f8627a319",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "f19a8e77cb9618d05fd6febefc953eb402a741b7f4fb86c8d86ff1c2e343a61e",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "eae9fc2d4aa264963897e3a895b746ebed27d5505653c285b7c8790a4744f022",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "210b4a3a6fcefd4f168389a97bbd04eef60f8847f0b57faa9e90cef512413f23",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "4b75819beecc6729e38bf3cfd887d1689b7645acc7290e91b90ccd963f84d723",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "fcb63c28b6c811190e382db55e73f9a36d14cf9cdaeb3db1c0e41baa48154e27",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "9f844da1ead75567e5aebe15fb8963f9666c0c4487d31d27a2a6e4d866453a28",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "9598a5918e3f8f657cc80e0fb26ca78de39d90c0bbbcd7c59338af82bb37b828",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "ac76874914fb7a06d09021e441afd0580eff14b8b2c0f6abc82c82162647be2a",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "56a7e8a961bbf98c7df3a396b6f20bf69c1bd7f64f8f55039335a2276c53072c",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "4d8f562b31330402b891c8b38ae21ee82bdaba1381b55ea066b8ebe4db0d4f31",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "bd64ab853a8d20a089ec97a50bd54a21863b1ce8b173f2d64d0e787a82102935",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "e4fc6026760e92bf881596e18464c4deb9f21efb514d22a0c219ef4a31ef5035",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "d1fc555cb1fe314b4a6f2ea9d6e6d9e9ff3799d4f88e38d81ba9c31278c1323d",
      vout: 0,
      sequence: 4294967295,
    },
    {
      txid: "d6e46010f1273d205080c65299543f9299ed18419019753b197dfca53527863e",
      vout: 0,
      sequence: 4294967295,
    },
  ],
  vout: [],
  vShieldedSpend: [],
  vShieldedOutput: [
    {
      cmu: "2822d719f971ea71",
    },
    {
      cmu: "323de81cde3119e3",
    },
  ],
  vjoinsplit: [],
  orchard: {
    valueBalance: 0.0,
    valueBalanceZat: 0,
    actions: [],
  },
};

// Ironwood value moved into 2 Sapling outputs: empty vin and vout, fee 20,000 zat
export const SAPLING_IRONWOOD_TX: ZcashRawTransaction = {
  txid: "c973d2f1273608f2bcd708172924c47b4b378ee3748b3caa2c69cd8f194aa7db",
  version: 6,
  versiongroupid: "d884b698",
  locktime: 0,
  expiryheight: 3483438,
  size: 11134,
  height: 3483400,
  confirmations: 66,
  time: 1789411472,
  blocktime: 1789411472,
  blockhash: "00000000005cba2d18fb12ef13dc7245eccb5708a590ceaad47ff76fc7fc2af3",
  valueBalance: -0.03,
  valueBalanceZat: -3000000,
  vin: [],
  vout: [],
  vShieldedSpend: [],
  vShieldedOutput: [
    {
      cmu: "19b76b4088552954",
    },
    {
      cmu: "4a9d9e16298871d4",
    },
  ],
  vjoinsplit: [],
  orchard: {
    valueBalance: 0.0,
    valueBalanceZat: 0,
    actions: [],
  },
  ironwood: {
    valueBalance: 0.0302,
    valueBalanceZat: 3020000,
    actions: [
      {
        nullifier: "6ee4627eb7c0ed1a",
        cmx: "cd5b59fb5cc9e169",
      },
      {
        nullifier: "df18b27f2a5f3ca9",
        cmx: "9327d58a24440dea",
      },
    ],
  },
};

const BLOCK_HEADER: Omit<ZcashRawBlock, "tx"> = {
  hash: "00000000005cba2d18fb12ef13dc7245eccb5708a590ceaad47ff76fc7fc2af3",
  confirmations: 66,
  height: 3483400,
  version: 4,
  merkleroot: "c4388ee51d0651c116ccfab9a5521b5b6ed73e97d1d74f16e0662729b3e268f4",
  blockcommitments: "2fcfe1dcb6405b7e884a0719eadfc6f7b467b35471b092be94dec32c89c71e9f",
  finalsaplingroot: "6a6e75909903c7478239a74aade9b263407c5b2566918a08c8a019a450ef6209",
  finalorchardroot: "0c38d8b2ced64ebf2d0d16d266c096886225ffae3ccd8368929ada511414de2f",
  time: 1789411472,
  nonce: "a9a10440000000000000000000820000000000000000000000000000b3030002",
  solution: "009b1e12cac2a2dfd38de20f0660113d9745bb51740a17fd3fcc9d91298b5523",
  bits: "1c008816",
  difficulty: 252485109.5066307,
  previousblockhash: "0000000000590aedad2fef0aa96f90624327bb4697c17196072e996ed38af672",
  nextblockhash: "00000000001e0766b207e1399ce4ced7f1750e1e2826e9dd070d79dd134e377e",
  size: 84186,
  nTx: 18,
  trees: {
    sapling: {
      size: 73958787,
    },
    orchard: {
      size: 50458646,
    },
    ironwood: {
      size: 318976,
    },
  },
  chainSupply: {
    chainValueZat: 1693244547804480,
  },
  valuePools: [
    {
      id: "transparent",
      chainValueZat: 1197462293176688,
    },
    {
      id: "sprout",
      chainValueZat: 2259146261837,
    },
    {
      id: "sapling",
      chainValueZat: 51143793106239,
    },
    {
      id: "orchard",
      chainValueZat: 41721442478352,
    },
    {
      id: "lockbox",
      chainValueZat: 6318768750000,
    },
    {
      id: "ironwood",
      chainValueZat: 394339104031364,
    },
  ],
};

export const BLOCK_3483400: ZcashRawBlock = {
  ...BLOCK_HEADER,
  tx: [COINBASE_TX, IRONWOOD_ONLY_TX, SHIELDING_TX, SAPLING_IRONWOOD_TX],
};
