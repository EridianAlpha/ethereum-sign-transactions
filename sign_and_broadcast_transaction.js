require('dotenv').config()

const ethers = require('ethers')
const readlineSync = require('readline-sync')

let customHttpProvider

async function main() {

  let chainId = parseInt(await readlineSync.question("Chain Ids\n1 - Mainnet\n5 - Goerli\nEnter chainId: "))

  // ********************
  // DEFINE RPC PROVIDER
  // ********************
  if (readlineSync.keyInYN("Connect to RPC? ")) {
    if (chainId == 1) {
      customHttpProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_ADDRESS_MAINNET)
    } else if (chainId == 5) {
      customHttpProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_ADDRESS_GOERLI)
    }
  }


  // *****************
  // DEFINE MY WALLET
  // *****************
  let mnemonic = await readlineSync.question("Enter wallet mnemonic: ", {hideEchoBack: true })
  let walletDerivative = await readlineSync.question("Enter wallet derivative (0, 1, 2, etc.): ")

  let walletDerivativeCombined = `m/44'/60'/0'/0/` + walletDerivative
  let wallet = new ethers.Wallet.fromMnemonic(mnemonic, walletDerivativeCombined)

  console.log('\nMY WALLET ADDRESS')
  console.log(wallet.address)
  console.log()

  // **********************
  // TRANSACTION VARIABLES
  // **********************
  let sendToAddress = await readlineSync.question("Enter sendToAddress: ")
  let ethAmount = await readlineSync.question("Enter ethAmount to send: ")
  let gasLimit = '21000'
  let maxPriorityFeePerGasGwei = await readlineSync.question("Enter maxPriorityFeePerGasGwei: ")
  let maxFeePerGasGwei = await readlineSync.question("Enter maxFeePerGasGwei: ")

  let nonce
  if (customHttpProvider) {
    nonce = await customHttpProvider.getTransactionCount(wallet.address)
  } else {
    nonce = await readlineSync.question("Enter nonce: ")
  }

  let transactionType = 2

  if (chainId == 1) {
    console.log ("\n*******************\nMAINNET TRANSACTION\n*******************")
  }


  // ******************
  // PRINT WALLET INFO
  // ******************
  console.log('\nMY WALLET ADDRESS')
  console.log(wallet.address)
  console.log('\nSEND TO ADDRESS')
  console.log(sendToAddress)


  // *******************
  // CREATE TRANSACTION
  // *******************
  let transaction = {
    to: sendToAddress,                                                                // The address to send Ether to
    value: ethers.utils.parseEther(ethAmount),                                        // The amount of Ether to send
    gasLimit: gasLimit,                                                               // The maximum units of gas to consume in this transaction, set to 21000 for basic Ether transfers
    maxPriorityFeePerGas: ethers.utils.parseUnits(maxPriorityFeePerGasGwei, 'gwei'),  // The tip paid to miners, introduced in EIP-1559
    maxFeePerGas: ethers.utils.parseUnits(maxFeePerGasGwei, 'gwei'),                  // The maximum price paid per unit of gas, introduced in EIP-1559
    nonce: nonce,                                                                     // The number of transactions sent from the address
    type: transactionType,                                                            // Set to 0x2, to denote EIP-1559 type transactions
    chainId: chainId                                                                  // The chain ID to send the transaction, for example 3 for Ropsten
  }


  // ***********************************
  // SIGN AND SERIALIZE THE TRANSACTION
  // ***********************************
  let rawTransaction = await wallet.signTransaction(transaction).then(ethers.utils.serializeTransaction(transaction))


  // *************************
  // PRINT SIGNED TRANSACTION
  // *************************
  console.log('\nSIGNED TRANSACTION')
  console.log(rawTransaction)

  if (chainId == 1) {
    console.log ("\n*******************\nMAINNET TRANSACTION\n*******************")
  }

  // *******************************************
  // SEND SIGNED TRANSACTION TO LOCAL GETH NODE
  // *******************************************
  if (customHttpProvider) {
    if (readlineSync.keyInYN("\nBroadcast Transaction? ")) {
      let sentTransaction = await customHttpProvider.sendTransaction(rawTransaction)
      console.log('\nSENT TRANSACTION HASH')
      console.log(sentTransaction.hash)

      console.log('\nTRANSACTION STATUS')

      let currentBlock = await customHttpProvider.getBlockNumber()
      console.log("Current block: " + currentBlock)

      let txBlockNumber = null
      let logTimer = 9

      while (!txBlockNumber) {
        tx = await customHttpProvider.getTransaction(sentTransaction.hash)

        if (!tx.blockNumber) {
          if (logTimer >= 9) {
            console.log("TX pending...")
            logTimer = 0
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
          logTimer++
        } else {
          console.log("TX CONFIRMED!")
          console.log("Confirmed in block: " + tx.blockNumber)
          txBlockNumber = tx.blockNumber
        }
      }
    }
  }
}

main()
