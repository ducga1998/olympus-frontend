import { t } from "@lingui/macro";
import { ContractReceipt } from "ethers";
import { useMutation, useQueryClient } from "react-query";
import { useDispatch } from "react-redux";
import { GOHM_ADDRESSES, SOHM_ADDRESSES, STAKING_ADDRESSES } from "src/constants/addresses";
import { trackGAEvent } from "src/helpers/analytics/trackGAEvent";
import { DecimalBigNumber } from "src/helpers/DecimalBigNumber/DecimalBigNumber";
import { balanceQueryKey, useBalance } from "src/hooks/useBalance";
import { useDynamicStakingContract } from "src/hooks/useContract";
import { useTestableNetworks } from "src/hooks/useTestableNetworks";
import { error as createErrorToast, info as createInfoToast } from "src/slices/MessagesSlice";
import { useAccount } from "wagmi";

export const useWrapSohm = () => {
  const dispatch = useDispatch();
  const client = useQueryClient();
  const { data: account } = useAccount();
  const address = account?.address ? account.address : "";

  const networks = useTestableNetworks();
  const balance = useBalance(SOHM_ADDRESSES)[networks.MAINNET].data;
  const contract = useDynamicStakingContract(STAKING_ADDRESSES, true);

  return useMutation<ContractReceipt, Error, string>(
    async amount => {
      if (!amount || isNaN(Number(amount))) throw new Error(t`Please enter a number`);

      const _amount = new DecimalBigNumber(amount, 9);

      if (!_amount.gt("0")) throw new Error(t`Please enter a number greater than 0`);

      if (!balance) throw new Error(t`Please refresh your page and try again`);

      if (_amount.gt(balance)) throw new Error(t`You cannot wrap more than your sOHM balance`);

      if (!contract) throw new Error(t`Please switch to the Ethereum network to wrap your sOHM`);

      if (!address) throw new Error(t`Please refresh your page and try again`);

      const transaction = await contract.wrap(address, _amount.toBigNumber());
      return transaction.wait();
    },
    {
      onError: error => {
        dispatch(createErrorToast(error.message));
      },
      onSuccess: async (_, amount) => {
        trackGAEvent({
          category: "Wrapping",
          action: "Wrap sOHM",
          value: new DecimalBigNumber(amount, 9).toApproxNumber(),
        });

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
