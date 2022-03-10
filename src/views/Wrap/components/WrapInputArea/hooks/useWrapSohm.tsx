import { t } from "@lingui/macro";
import { ContractReceipt } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { useMutation, useQueryClient } from "react-query";
import { useDispatch } from "react-redux";
import { GOHM_ADDRESSES, SOHM_ADDRESSES, STAKING_ADDRESSES } from "src/constants/addresses";
import { useWeb3Context } from "src/hooks";
import { balanceQueryKey, useBalance } from "src/hooks/useBalance";
import { useDynamicStakingContract } from "src/hooks/useContract";
import { useTestableNetworks } from "src/hooks/useTestableNetworks";
import { error as createErrorToast, info as createInfoToast } from "src/slices/MessagesSlice";

export const useWrapSohm = () => {
  const dispatch = useDispatch();
  const client = useQueryClient();
  const { address } = useWeb3Context();
  const networks = useTestableNetworks();
  const balance = useBalance(SOHM_ADDRESSES)[networks.MAINNET].data;
  const contract = useDynamicStakingContract(STAKING_ADDRESSES, true);

  return useMutation<ContractReceipt, Error, string>(
    async amount => {
      if (!amount || isNaN(Number(amount))) throw new Error(t`Please enter a number`);

      const parsedAmount = parseUnits(amount, 9);

      if (!parsedAmount.gt(0)) throw new Error(t`Please enter a number greater than 0`);

      if (!balance) throw new Error(t`Please refresh your page and try again`);

      if (parsedAmount.gt(balance)) throw new Error(t`You cannot wrap more than your sOHM balance`);

      if (!contract) throw new Error(t`Please switch to the Ethereum network to wrap your sOHM`);

      if (!address) throw new Error(t`Please refresh your page and try again`);

      const transaction = await contract.wrap(address, parsedAmount);
      return transaction.wait();
    },
    {
      onError: error => {
        dispatch(createErrorToast(error.message));
      },
      onSuccess: async () => {
        const keysToRefetch = [
          balanceQueryKey(address, SOHM_ADDRESSES, networks.MAINNET),
          balanceQueryKey(address, GOHM_ADDRESSES, networks.MAINNET),
        ];

        const promises = keysToRefetch.map(key => client.refetchQueries(key, { active: true }));

        await Promise.all(promises);

        dispatch(createInfoToast(t`Successfully wrapped sOHM to gOHM`));
      },
    },
  );
};
