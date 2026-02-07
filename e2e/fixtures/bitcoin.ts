// cspell:ignore satoshi segwit taproot coinbase
export const BITCOIN = {
  networkSlug: "btc",

  blocks: {
    // Genesis block - special case with unspendable coinbase
    "0": {
      number: 0,
      hash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
      txCount: 1,
      size: "285 bytes",
      weight: "1,140 WU",
      difficulty: "1",
      miner: "Unknown",
      reward: "50 BTC",
    },
    // Block 481,824 - First SegWit block (August 24, 2017)
    "481824": {
      number: 481824,
      hash: "0000000000000000001c8018d9cb3b742ef25114f27563e3fc4a1902167f9893",
      txCount: 1620,
      difficulty: "888,171,856,257",
      miner: "BTC.com",
    },
    // Block 709,632 - First Taproot block (November 14, 2021)
    "709632": {
      number: 709632,
      hash: "0000000000000000000687bca986194dc2c1f949318629b44bb54ec0a94d8244",
      txCount: 1883,
      difficulty: "22,674,148,233,453",
    },
    // Recent block with mixed transaction types
    "800000": {
      number: 800000,
      hash: "00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72728a054",
      txCount: 3721,
      size: "1,616,842 bytes",
      weight: "3,993,200 WU",
      difficulty: "53,911,173,001,054",
      miner: "Foundry USA",
      reward: "6.25 BTC",
    },
  },

  transactions: {
    // Genesis coinbase - unspendable (block 0)
    genesisCoinbase: {
      txid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
      blockHeight: 0,
      isCoinbase: true,
      inputCount: 1,
      outputCount: 1,
      value: "50 BTC",
      fee: "0 BTC",
    },
    // Regular coinbase transaction (miner reward)
    coinbase: {
      txid: "8f9145f8b6c33062f6dfa1b5eec7f2e1d1a40f4cb1c2d8e6d2f4c6d0e4b8a5c7",
      blockHeight: 800000,
      isCoinbase: true,
      miner: "Foundry USA",
    },
    // Legacy transaction (pre-SegWit, no witness data)
    legacy: {
      txid: "a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d",
      blockHeight: 57043,
      hasWitness: false,
      inputCount: 1,
      outputCount: 2,
      // Famous "10,000 BTC pizza" transaction from 2010
      value: "10,000 BTC",
    },
    // SegWit transaction (bc1q address, with witness data)
    segwit: {
      txid: "c1b4e695098210a31fe02abffe9005cffc051bbe86ff33e173155bcbdc5821e3",
      blockHeight: 481824,
      hasWitness: true,
      inputCount: 1,
      outputCount: 2,
    },
    // Taproot transaction (bc1p address)
    taproot: {
      txid: "33e794d097969002ee05d336686fc03c9e15a597c1b9827669460fac98799036",
      blockHeight: 709632,
      hasWitness: true,
      inputCount: 1,
      outputCount: 2,
    },
    // Transaction with OP_RETURN output
    opReturn: {
      txid: "8bae12b5f4c088d940733dcd1455efc6a3a69cf9340e17a981286d3778615684",
      blockHeight: 230009,
      hasOpReturn: true,
    },
  },

  addresses: {
    // Satoshi's genesis address (P2PKH legacy)
    genesis: {
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      type: "Legacy (P2PKH)",
      prefix: "1",
      // Balance is ~72 BTC from donations (unspendable genesis + donations)
      hasBalance: true,
    },
    // Legacy P2PKH address
    legacy: {
      address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
      type: "Legacy (P2PKH)",
      prefix: "1",
    },
    // P2SH address (multisig)
    p2sh: {
      address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
      type: "P2SH",
      prefix: "3",
    },
    // Native SegWit address (P2WPKH)
    segwit: {
      address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      type: "SegWit (P2WPKH)",
      prefix: "bc1q",
    },
    // Taproot address (P2TR)
    taproot: {
      address: "bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297",
      type: "Taproot (P2TR)",
      prefix: "bc1p",
    },
  },
};
