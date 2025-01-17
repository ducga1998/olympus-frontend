import "./Zap.scss";

import { Trans } from "@lingui/macro";
import { Box, Typography } from "@mui/material";
import { Paper } from "@olympusdao/component-library";
import React, { useMemo } from "react";
import { useNavigate } from "react-router";
import { InPageConnectButton } from "src/components/ConnectButton/ConnectButton";
import { usePathForNetwork } from "src/hooks/usePathForNetwork";
import { useZapTokenBalances } from "src/hooks/useZapTokenBalances";
import { useConnect, useNetwork } from "wagmi";

import ZapInfo from "./ZapInfo";
import ZapStakeAction from "./ZapStakeAction";

const Zap: React.FC = () => {
  const { isConnected } = useConnect();
  const { activeChain = { id: 1 } } = useNetwork();
  const navigate = useNavigate();
  usePathForNetwork({ pathName: "zap", networkID: activeChain.id, navigate });

  const zapTokenBalances = useZapTokenBalances();
  const tokens = zapTokenBalances.data?.balances;
  const inputTokenImages = useMemo(() => {
    if (tokens) {
      return Object.entries(tokens)
        .filter(token => token[0] !== "sohm")
        .map(token => token[1].tokenImageUrl)
        .slice(0, 3);
    } else {
      return [];
    }
  }, [tokens]);

  return (
    <div id="zap-view">
      <Paper headerText={isConnected ? `Zap` : ""}>
        <div className="staking-area">
          {!isConnected ? (
            <div className="stake-wallet-notification">
              <div className="wallet-menu" id="wallet-menu">
                <InPageConnectButton />
              </div>
              <Typography variant="h6">
                <Trans>Connect your wallet to use Zap</Trans>
              </Typography>
            </div>
          ) : (
            <Box className="stake-action-area">
              <ZapStakeAction />
            </Box>
          )}
        </div>
      </Paper>

      <ZapInfo tokens={inputTokenImages} />
    </div>
  );
};

export default Zap;
