// cspell:ignore vitalik beaverbuild dencun bayc rarible rari
export const MAINNET = {
  chainId: "1",

  blocks: {
    // Genesis block - special case with no transactions
    "0": {
      number: 0,
      txCount: 0,
    },
    // Block 10,000 - Pre-London, no transactions
    "10000": {
      number: 10000,
      txCount: 0,
      gasUsed: "0",
      gasUsedPercent: "0.0%",
      gasLimit: "5,000",
      size: "541 bytes",
      feeRecipientPartial: "0xbf71642d",
      difficulty: "598,426,820,912",
      totalDifficulty: "598,426,820,912",
      extraData: "Geth/v1.0.0/windows/go1.4.2",
      // More details section
      hash: "0xdc2d938e4cd0a149681e9e04352953ef5ab399d59bcd5b0357f6c0797470a524",
      parentHash: "0xb9ecd2df84ee2687efc0886f5177f6674bad9aeb73de9323e254e15c5a34fc93",
      stateRoot: "0x4de830f589266773eae1a1caa88d75def3f3a321fbd9aeb89570a57c6e7f3dbb",
      transactionsRoot: "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
      receiptsRoot: "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
      nonce: "0xb75e5f372524d34c",
      mixHash: "0xc6bf383db032101cc2101543db260602b709e5d9e38444bb71b680777185448b",
      sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    },
    // Block 1,000,000 - Pre-London, with 2 transactions
    "1000000": {
      number: 1000000,
      txCount: 2,
      gasUsed: "50,244",
      gasUsedPercent: "1.6%",
      gasLimit: "3,141,592",
      size: "768 bytes",
      feeRecipientPartial: "0x2a65aca4",
      difficulty: "12,549,332,509,227",
      totalDifficulty: "12,549,332,509,227",
      extraData: "0xd783010303844765746887676f312e352e31856c696e7578",
      // More details section
      hash: "0x8e38b4dbf6b11fcc3b9dee84fb7986e29ca0a02cecd8977c161ff7333329681e",
      parentHash: "0xb4fbadf8ea452b139718e2700dc1135cfc81145031c84b7ab27cd710394f7b38",
      stateRoot: "0x0e066f3c2297a5cb300593052617d1bca5946f0caa0635fdb1b85ac7e5236f34",
      transactionsRoot: "0x65ba887fcb0826f616d01f736c1d2d677bcabde2f7fc25aa91cfbc0b3bad5cb3",
      receiptsRoot: "0x20e3534540caf16378e6e86a2bf1236d9f876d3218fbc03958e6db1c634b2333",
      nonce: "0xcd4c55b941cf9015",
      mixHash: "0x92c4129a0ae2361b452a9edeece55c12eceeab866316195e3d87fc1b005b6645",
      sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    },
    // Block 20,000,000 - Post-London (EIP-1559), with base fee and withdrawals
    "20000000": {
      number: 20000000,
      txCount: 134,
      withdrawals: 16,
      gasUsed: "11,089,692",
      gasUsedPercent: "37.0%",
      gasLimit: "30,000,000",
      size: "51,097 bytes",
      feeRecipientPartial: "0x95222290",
      baseFeePerGas: "4.936957716 Gwei",
      burntFees: "0.054749340487 ETH",
      extraData: "beaverbuild.org",
      // More details section
      hash: "0xd24fd73f794058a3807db926d8898c6481e902b7edb91ce0d479d6760f276183",
      parentHash: "0xb390d63aac03bbef75de888d16bd56b91c9291c2a7e38d36ac24731351522bd1",
      stateRoot: "0x68421c2c599dc31396a09772a073fb421c4bd25ef1462914ef13e5dfa2d31c23",
      transactionsRoot: "0xf0280ae7fd02f2b9684be8d740830710cd62e4869c891c3a0ead32ea757e70a3",
      receiptsRoot: "0xb39f9f7a13a342751bd2c575eca303e224393d4e11d715866b114b7e824da608",
      withdrawalsRoot: "0xf0747de0368fb967ede9b81320a5b01a4d85b3d427e8bc8e96ff371478d80e76",
      nonce: "0x0000000000000000",
      mixHash: "0x85175443c2889afcb52288e0fa8804b671e582f9fd416071a70642d90c7dc0db",
      sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    },
    // Block 12,964,999 - Last block before London hard fork (no base fee)
    "12964999": {
      number: 12964999,
      txCount: 145,
      gasUsed: "15,026,712",
      gasUsedPercent: "100.0%",
      gasLimit: "15,029,237",
      size: "80,836 bytes",
      feeRecipientPartial: "0x3ecef08d",
      extraData: "vir1",
      difficulty: "7,742,493,487,903,256",
      totalDifficulty: "7,742,493,487,903,256",
      // More details section
      hash: "0x3de6bb3849a138e6ab0b83a3a00dc7433f1e83f7fd488e4bba78f2fe2631a633",
      parentHash: "0x8e2b6ba8d440307457807fe9bbe1d3ef330ab12177166f69f8d4f7186e396de7",
      stateRoot: "0x4035f600ba18453e0e4506b980180424c8f1853cc5dffea0be3e960993b7f828",
      transactionsRoot: "0x113e7f3abfe0d307a0a945c3452fae7e34176d2432d5f59becd3b2ca2a3acabf",
      receiptsRoot: "0x89b5c46add2ad67cb815fac58475de67e7ed1557477f980d37605b5d75f5efc7",
      logsBloom:
        "0x5ca74187e553152f19d432f6f420ba370956018791d04ce2013d6245fcc9f581823f6d58e404b7e0d545dafb3bad01100ae785e64bb4e9516d4385e212a668da58685120b002b33ecae2da1fb08877e4193c9c470e6c3309524e7d7b907f05e3be19c340bb029fa2c596fc014230bec0d233dde9f95ba6e7834573faa22d4faad9e5a17f9ed05098b3d1d3510982b83f5344cc956d61b53dbf7509f92d5a3bb2b7de5e6822213a3322b56fb49806b7a0341e4e1000b630231f739684dcbfff1d5b4016ee75ab4c4a29d29ff7c76b1de47f4df308658b4a52d26228d638d4ec600230aa923d621b68f8a7174443acc020c5a1ca307ff081f81bc8cdbeea051a7d",
      nonce: "0xa3de6d1d51ea8f7d",
      mixHash: "0x069f4780d57aaa74ae768c2948afaf9f5c03d26e59ccc9fd93092af8a48bed5c",
      sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    },
    // Block 12,965,000 - London hard fork block (EIP-1559)
    "12965000": {
      number: 12965000,
      txCount: 259,
      gasUsed: "30,025,257",
      gasUsedPercent: "100.0%",
      gasLimit: "30,029,122",
      size: "137,049 bytes",
      feeRecipientPartial: "0x77777882",
      baseFeePerGas: "1.000000000 Gwei",
      burntFees: "0.030025257000 ETH",
      extraData: "https://www.kryptex.org",
      difficulty: "7,742,494,561,645,080",
      totalDifficulty: "7,742,494,561,645,080",
      // More details section
      hash: "0x9b83c12c69edb74f6c8dd5d052765c1adf940e320bd1291696e6fa07829eee71",
      parentHash: "0x3de6bb3849a138e6ab0b83a3a00dc7433f1e83f7fd488e4bba78f2fe2631a633",
      stateRoot: "0x41cf6e8e60fd087d2b00360dc29e5bfb21959bce1f4c242fd1ad7c4da968eb87",
      transactionsRoot: "0xdfcb68d3a3c41096f4a77569db7956e0a0e750fad185948e54789ea0e51779cb",
      receiptsRoot: "0x8a8865cd785e2e9dfce7da83aca010b10b9af2abbd367114b236f149534c821d",
      logsBloom:
        "0x24e74ad77d9a2b27bdb8f6d6f7f1cffdd8cfb47fdebd433f011f7dfcfbb7db638fadd5ff66ed134ede2879ce61149797fbcdf7b74f6b7de153ec61bdaffeeb7b59c3ed771a2fe9eaed8ac70e335e63ff2bfe239eaff8f94ca642fdf7ee5537965be99a440f53d2ce057dbf9932be9a7b9a82ffdffe4eeee1a66c4cfb99fe4540fbff936f97dde9f6bfd9f8cefda2fc174d23dfdb7d6f7dfef5f754fe6a7eec92efdbff779b5feff3beafebd7fd6e973afebe4f5d86f3aafb1f73bf1e1d0cdd796d89827edeffe8fb6ae6d7bf639ec5f5ff4c32f31f6b525b676c7cdf5e5c75bfd5b7bd1928b6f43aac7fa0f6336576e5f7b7dfb9e8ebbe6f6efe2f9dfe8b3f56",
      nonce: "0xb223da049adf2216",
      mixHash: "0x9620b46a81a4795cf4449d48e3270419f58b09293a5421205f88179b563f815a",
      sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    },
  },

  transactions: {
    // ============================================
    // LEGACY TRANSACTIONS (Type 0) - Pre-EIP-2718
    // ============================================

    // First ever ETH transfer (block 46147, mined Aug 7, 2015)
    // Type 0 - Legacy transaction with gasPrice
    "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060": {
      hash: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
      type: 0,
      from: "0xa1e4380a3b1f749673e270229993ee55f35663b4",
      to: "0x5df9b87991262f6ba471f09758cde1c0fc1de734",
      value: "0x7a69", // 31337 wei
      blockNumber: 46147,
      gas: "21,000",
      gasPrice: "50,000,000,000,000", // 50,000 Gwei (early Ethereum)
      gasUsed: "21,000",
      nonce: 0,
      status: "success" as const,
      // No maxFeePerGas or maxPriorityFeePerGas (pre-EIP-1559)
    },

    // ============================================
    // EIP-1559 TRANSACTIONS (Type 2) - Post-London
    // ============================================

    // Type 2 EIP-1559 transaction from block 20,000,000
    "0xbb4b3fc2b746877dce70862850602f1d19bd890ab4db47e6b7ee1da1fe578a0d": {
      hash: "0xbb4b3fc2b746877dce70862850602f1d19bd890ab4db47e6b7ee1da1fe578a0d",
      type: 2,
      from: "0xae2fc483527b8ef99eb5d9b44875f005ba1fae13",
      to: "0x6b75d8af000000e20b7a7ddf000ba900b4009a80",
      value: "0x3e987a00", // ~1.05 ETH
      blockNumber: 20000000,
      gas: "458,541",
      gasUsed: "321,491",
      maxFeePerGas: "4.936957716 Gwei",
      maxPriorityFeePerGas: "0 Gwei",
      effectiveGasPrice: "4.936957716 Gwei",
      nonce: 2756766,
      status: "success" as const,
      hasInputData: true,
      // No gasPrice field in Type 2 transactions
    },

    // USDC approval transaction - common ERC20 interaction (Type 2)
    "0xc55e2b90168af6972193c1f86fa4d7d7b31a29c156665d15b9cd48618b5177ef": {
      hash: "0xc55e2b90168af6972193c1f86fa4d7d7b31a29c156665d15b9cd48618b5177ef",
      type: 2,
      from: "0x28C6c06298d514Db089934071355E5743bf21d60",
      to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      blockNumber: 15537394,
      status: "success" as const,
      hasInputData: true,
    },

    // ============================================
    // BLOB TRANSACTIONS (Type 3) - Post-Dencun (EIP-4844)
    // ============================================

    // Type 3 Blob transaction from block 21,000,000 (Base L2 batch submission)
    "0x7ad8a2d854221c024bc84449c0eb756c81b8db95d6774765189305e28b1c029a": {
      hash: "0x7ad8a2d854221c024bc84449c0eb756c81b8db95d6774765189305e28b1c029a",
      type: 3,
      from: "0x5050f69a9786f081509234f1a7f4684b5e5b76c9",
      to: "0xff00000000000000000000000000000000008453", // Base L2 batch inbox
      value: "0x0",
      blockNumber: 21000000,
      gas: "21,000",
      gasUsed: "21,000",
      maxFeePerGas: "36.636641947 Gwei",
      maxPriorityFeePerGas: "2.012051071 Gwei",
      effectiveGasPrice: "20.169830720 Gwei",
      // Blob-specific fields
      maxFeePerBlobGas: "1 Gwei",
      blobGasUsed: "655,360", // 5 blobs * 131,072 bytes
      blobGasPrice: "1 wei",
      blobCount: 5,
      nonce: 556803,
      status: "success" as const,
    },

    // ============================================
    // FAILED TRANSACTIONS
    // ============================================

    // Failed transaction (status 0x0) - reverted contract call
    "0x15f8e5ea1079d9a0bb04a4c58ae5fe7654b5b2b4463375ff7ffb490aa0032f3a": {
      hash: "0x15f8e5ea1079d9a0bb04a4c58ae5fe7654b5b2b4463375ff7ffb490aa0032f3a",
      type: 0,
      from: "0x58eb28a67731c570ef827c365c89b5751f9e6b0a",
      to: "0xbf4ed7b27f1d666546e30d74d50d173d20bca754",
      value: "0x0",
      blockNumber: 2166348,
      gas: "150,000",
      gasUsed: "150,000", // All gas consumed on failure
      gasPrice: "21,000,000,000", // 21 Gwei
      nonce: 30,
      status: "failed" as const,
      hasInputData: true, // Contains function selector 0x3ccfd60b (withdraw)
    },

    // ============================================
    // CONTRACT CREATION TRANSACTIONS
    // ============================================

    // Contract creation (to: null) - Type 2 EIP-1559
    "0x452dd11bf2cac23a2c366d0adae6cc6451a3665c89449a96287aedfce1805293": {
      hash: "0x452dd11bf2cac23a2c366d0adae6cc6451a3665c89449a96287aedfce1805293",
      type: 2,
      from: "0x08eec580ad41e9994599bad7d2a74a9874a2852c",
      to: null, // Contract creation has no 'to' address
      value: "0x0",
      blockNumber: 24053298,
      gas: "801,386",
      gasUsed: "794,942",
      maxFeePerGas: "2.181898787 Gwei",
      maxPriorityFeePerGas: "2,000,000,000 wei",
      effectiveGasPrice: "2.126998446 Gwei",
      nonce: 680,
      status: "success" as const,
      contractAddress: "0xd5bd7a2d6e13d351e157e2a0396dac810d6af390",
      hasInputData: true, // Contains contract bytecode
    },
  },

  addresses: {
    // Vitalik's address - well known EOA with ENS
    vitalik: {
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      type: "contract" as const, // Now a contract after EIP-4337
      hasENS: true,
      ensName: "vitalik.eth",
    },
    // USDC contract - ERC20 token
    usdc: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      type: "erc20" as const,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    // Uniswap V2 Router - verified contract
    uniswapRouter: {
      address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      type: "contract" as const,
      name: "Uniswap V2: Router 2",
    },
    // Bored Ape Yacht Club - ERC721 NFT collection
    bayc: {
      address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      type: "erc721" as const,
      name: "BoredApeYachtClub",
      fullName: "Bored Ape Yacht Club",
      symbol: "BAYC",
      // NFT Collection Details
      totalMinted: "10,000 NFTs",
      // Contract Details
      verified: true,
      verifiedAt: "8/8/2024",
      matchType: "Partial Match",
      compiler: "0.7.0+commit.9e61f92b",
      // Read Functions (21 total)
      readFunctions: [
        "BAYC_PROVENANCE",
        "MAX_APES",
        "REVEAL_TIMESTAMP",
        "apePrice",
        "balanceOf",
        "baseURI",
        "getApproved",
        "isApprovedForAll",
        "maxApePurchase",
        "name",
        "owner",
        "ownerOf",
        "saleIsActive",
        "startingIndex",
        "startingIndexBlock",
        "supportsInterface",
        "symbol",
        "tokenByIndex",
        "tokenOfOwnerByIndex",
        "tokenURI",
        "totalSupply",
      ],
      // Write Functions (16 total)
      writeFunctions: [
        "approve",
        "emergencySetStartingIndexBlock",
        "flipSaleState",
        "mintApe",
        "renounceOwnership",
        "reserveApes",
        "safeTransferFrom",
        "setApprovalForAll",
        "setBaseURI",
        "setProvenanceHash",
        "setRevealTimestamp",
        "setStartingIndex",
        "transferFrom",
        "transferOwnership",
        "withdraw",
      ],
      // Events (4 total)
      events: ["Approval", "ApprovalForAll", "OwnershipTransferred", "Transfer"],
    },
    // Rarible - ERC1155 multi-token collection
    rarible: {
      address: "0xd07dc4262BCDbf85190C01c996b4C06a461d2430",
      type: "erc1155" as const,
      name: "Rarible",
      symbol: "RARI",
      // Multi-Token Collection Details
      metadataUri: "ipfs:/",
      // Contract Details
      verified: true,
      verifiedAt: "8/8/2024",
      matchType: "MATCH",
      compiler: "0.5.17+commit.d19bba13",
      // Read Functions (16 total)
      readFunctions: [
        "balanceOf",
        "balanceOfBatch",
        "contractURI",
        "creators",
        "fees",
        "getFeeBps",
        "getFeeRecipients",
        "isApprovedForAll",
        "isOwner",
        "isSigner",
        "name",
        "owner",
        "supportsInterface",
        "symbol",
        "tokenURIPrefix",
        "uri",
      ],
      // Write Functions (12 total)
      writeFunctions: [
        "addSigner",
        "burn",
        "mint",
        "removeSigner",
        "renounceOwnership",
        "renounceSigner",
        "safeBatchTransferFrom",
        "safeTransferFrom",
        "setApprovalForAll",
        "setContractURI",
        "setTokenURIPrefix",
        "transferOwnership",
      ],
      // Events (8 total)
      events: [
        "ApprovalForAll",
        "OwnershipTransferred",
        "SecondarySaleFees",
        "SignerAdded",
        "SignerRemoved",
        "TransferBatch",
        "TransferSingle",
        "URI",
      ],
    },
  },

  // Specific NFT tokens for token detail page tests
  tokens: {
    // BAYC #1 - First Bored Ape
    baycToken1: {
      contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      tokenId: "1",
      standard: "erc721" as const,
      collectionName: "BoredApeYachtClub",
      collectionSymbol: "BAYC",
      collectionSize: "10,000 NFTs",
      tokenUri: "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/1",
      // Properties (5 total for token #1)
      properties: [
        { trait: "MOUTH", value: "Grin" },
        { trait: "CLOTHES", value: "Vietnam Jacket" },
        { trait: "BACKGROUND", value: "Orange" },
        { trait: "EYES", value: "Blue Beams" },
        { trait: "FUR", value: "Robot" },
      ],
    },
    // BAYC #100 - Another well-known Bored Ape
    baycToken100: {
      contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      tokenId: "100",
      standard: "erc721" as const,
      collectionName: "BoredApeYachtClub",
      collectionSymbol: "BAYC",
      collectionSize: "10,000 NFTs",
      tokenUri: "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/100",
      // Properties (5 total for token #100)
      properties: [
        { trait: "BACKGROUND", value: "Yellow" },
        { trait: "MOUTH", value: "Bored Cigarette" },
        { trait: "HAT", value: "Party Hat 2" },
        { trait: "FUR", value: "Dark Brown" },
        { trait: "EYES", value: "Wide Eyed" },
      ],
    },
    // Rarible token - ERC1155
    raribleToken: {
      contractAddress: "0xd07dc4262BCDbf85190C01c996b4C06a461d2430",
      tokenId: "1",
      standard: "erc1155" as const,
      collectionName: "Rarible",
      collectionSymbol: "RARI",
    },
  },
};
