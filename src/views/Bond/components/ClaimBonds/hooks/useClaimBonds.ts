import { t } from "@lingui/macro";
import { ContractReceipt } from "ethers";
import { useMutation, useQueryClient } from "react-query";
import { useDispatch } from "react-redux";
import { BOND_DEPOSITORY_CONTRACT } from "src/constants/contracts";
import { trackGAEvent, trackGtagEvent } from "src/helpers/analytics/trackGAEvent";
import { isValidAddress } from "src/helpers/misc/isValidAddress";
import { useTestableNetworks } from "src/hooks/useTestableNetworks";
import { error as createErrorToast, info as createInfoToast } from "src/slices/MessagesSlice";
import { useAccount, useNetwork, useSigner } from "wagmi";

import { bondNotesQueryKey } from "./useBondNotes";

export const useClaimBonds = () => {
  const dispatch = useDispatch();
  const client = useQueryClient();
  const networks = useTestableNetworks();
  const { data: account } = useAccount();
  const { data: signer } = useSigner();
  const { activeChain = { id: 1 } } = useNetwork();
  const address = account?.address ? account.address : "";
  return useMutation<ContractReceipt, Error, { id?: string; isPayoutGohm: boolean }>(
    async ({ id, isPayoutGohm }) => {
      if (!signer) throw new Error(t`Please connect a wallet to claim bonds`);
      if (activeChain.id !== networks.MAINNET)
        throw new Error(
          typeof id === "undefined"
            ? t`Please switch to the Ethereum network to claim all bonds`
            : t`Please switch to the Ethereum network to claim this bond`,
        );
      if (!isValidAddress(address) || !address) throw new Error(t`Invalid address`);

      const contract = BOND_DEPOSITORY_CONTRACT.getEthersContract(networks.MAINNET).connect(signer);

      if (id) {
        const transaction = await contract.redeem(address, [id], isPayoutGohm);
        return transaction.wait();
      }

      const transaction = await contract.redeemAll(address, isPayoutGohm);
      return transaction.wait();
    },
    {
      onError: error => {
        dispatch(createErrorToast(error.message));
      },
      onSuccess: async (tx, { id }) => {
        trackGAEvent({
          category: "Bonds",
          action: "Redeem",
          label: id ?? "unknown",
          dimension1: tx.transactionHash,
          dimension2: address,
        });

        trackGtagEvent("Redeem", {
          event_category: "Bonds",
          event_label: id ?? "unknown",
          address: address.slice(2),
          txHash: tx.transactionHash.slice(2),
        });

        const keysToRefetch = [bondNotesQueryKey(networks.MAINNET, address)];

        const promises = keysToRefetch.map(key => client.refetchQueries(key, { active: true }));

        await Promise.all(promises);

        dispatch(
          createInfoToast(typeof id === "undefined" ? t`Claimed all bonds successfully` : t`Claimed bond successfully`),
        );
      },
    },
  );
};
