import { ValidationError } from '@paraspell/sdk-core'
import { createPublicClient, custom, type TransactionSerializable, type WalletClient } from 'viem'

/**
 * viem silently discards a built transaction's `chainId` for JSON-RPC
 * accounts: `sendTransaction` overrides the request with the wallet's
 * CURRENT chain and only asserts against the passed `chain` object. A wallet
 * left on the wrong network can therefore sign a transaction that moves
 * funds to an address with no code on that network (irrecoverable loss).
 *
 * This guard fetches the wallet's real chainId and refuses to execute when
 * it does not match the chain the transaction was built for.
 */
export const assertWalletChain = async (
  signer: WalletClient,
  tx: TransactionSerializable,
): Promise<void> => {
  if (tx.chainId === undefined) return

  const publicClient = createPublicClient({ transport: custom(signer.transport) })
  const walletChainId = await publicClient.getChainId()

  if (walletChainId !== tx.chainId) {
    throw new ValidationError(
      `Wallet is connected to chainId ${walletChainId}, but the transaction targets chainId ${tx.chainId}. Switch the wallet network before executing.`,
    )
  }
}
