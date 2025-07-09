import { defineStore } from 'pinia'

import { Contract, ethers } from "ethers";
import { Web3Provider, JsonRpcSigner, Network } from '@ethersproject/providers'

import Summits from '../Summits.json'
import Aim from '../Aim.json'

import networkInfos, { Currency } from '../network-infos'

let provider: Web3Provider
let signer: JsonRpcSigner

let summitsContract: Contract
let aimContracts: {[address: string]: Contract} = {}

export const useWeb3Connection = defineStore('web3-connection', {
  state() {
    return {
      network: undefined as Network | undefined,
      nativeCurrency: undefined as Currency | undefined,
      address: ""
    }
  }, 
  actions: {
    async connect(
      onConnect: () => void, 
    ) {
      let ethereum = (window as any).ethereum

      // reload 
      ethereum.on('chainChanged', () => {
        window.location.reload();
      });
      ethereum.on('accountsChanged', () => {
        window.location.reload();
      });

      provider = new ethers.providers.Web3Provider(ethereum) 
      await provider.send("eth_requestAccounts", [])
      signer = provider.getSigner()

      signer.getAddress().then((address) => {
        this.address = address
      }) 

      provider.getNetwork().then((network) => {
        this.network = network
        let networkInfo = networkInfos[network.chainId]
        this.nativeCurrency = networkInfo.nativeCurrency
        summitsContract = new ethers.Contract(
          networkInfo.addr, 
          Summits.abi, 
          signer 
        );
        onConnect()
      })
      

    },
    getSummitsContract() {
      return summitsContract
    },
    getAimContract(address: string) {
      let contract = aimContracts[address]
      if(!contract) {
        contract = aimContracts[address] = new ethers.Contract(
          address,
          Aim.abi,
          signer
        ) 
      }
      return contract
    }
  }, 
}) 


