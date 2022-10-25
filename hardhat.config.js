require("@nomicfoundation/hardhat-toolbox");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');

const {
  ETHER_SCAN_APIKEY,
  COINMARKET_CAP_KEY,
  INFURAIO_URL,
  PRIVATE_KEY,
  BSC_TESTNET_URL,
  POLYGON_TESTNET_URL,
  POLYGONSCAN_KEY
} = require("./secrets.js");

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.17",
// };
// module.exports = {
//   solidity: {
//     version: "0.8.17",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 1000
//       },
//     },
//   },
// };

module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  etherscan: {
    apiKey: POLYGONSCAN_KEY
  },
  networks: {
    // mainet: {
    //   url: URL,
    //   accounts: [`0x${RINKEBY_PRIVATE_KEY}`],
    // },
    rinkeby: {
      url: INFURAIO_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    bsctestnet: {
      url: BSC_TESTNET_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    matic: {
      url: POLYGON_TESTNET_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    gasPrice: 21,
    coinmarketcap: COINMARKET_CAP_KEY,
  },
};
