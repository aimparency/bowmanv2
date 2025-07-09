// map from chainId to summits contract
export interface Currency {
  name: string, 
  symbol: string,
}

export interface NetworkInfo {
  addr: string, 
  nativeCurrency: Currency 
}

export default {
  5: {
    addr: '0x834d7FF1eb181852D9bdCBB151Af03aaB3B7F20c', 
    nativeCurrency: {
      name: 'GoerliEthereum',
      symbol: 'ETH',
    }
  }, 
  1337: {
    addr: '5FbDB2315678afecb367f032d93F642f64180aa3', 
    nativeCurrency: {
      name: 'localnetCurrency',
      symbol: 'ETH',
    }
  }, 
  80001: {
    addr: '834d7FF1eb181852D9bdCBB151Af03aaB3B7F20c', 
    nativeCurrency: {
      name: 'MumbaiMatic',
      symbol: 'MATIC',
    }
  }
} as {[chainId: number]: NetworkInfo};

