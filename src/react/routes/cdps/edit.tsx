import { useEffect, useState } from "react";
import { useParams, Link as RouterLink, Form, useNavigate, useActionData } from "react-router-dom";
import type { ActionFunction } from "react-router-dom";
import BigNumber from "bignumber.js";
import { useWallet } from "../../../wallet";
import { authenticatedContractCall } from "../../../utils/contractHelpers";
import { CDPDisplay } from "../../components/cdp/CDPDisplay";
import AddressDisplay from "../../components/cdp/AddressDisplay";
import { useContractCdp } from "../../hooks/useCdps";
import { 
  Button, 
  TextField, 
  Typography, 
  Box, 
  Container, 
  Grid, 
  Alert, 
  Snackbar,
  Link as MuiLink
} from "@mui/material";
import { useStabilityPoolMetadata } from "../../hooks/useStabilityPoolMetadata";
import { contractMapping, XAssetSymbol } from "../../../contracts/contractConfig";
import ErrorMessage from "../../components/errorMessage";
import { getContractBySymbol } from "../../../contracts/util";

interface ActionData {
  message: string;
  type: "success" | "error";
  lender: string;
  action: string
}

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const lender = formData.get("lender") as string;
  const amount = new BigNumber(formData.get("amount") as string).times(10 ** 7).toFixed(0);
  const assetSymbol = params.assetSymbol as XAssetSymbol;
  
  if (!assetSymbol || !contractMapping[assetSymbol]) {
    throw new Error("Invalid asset symbol");
  }

  const contractClient = getContractBySymbol(assetSymbol);

  let tx;
  switch (action) {
    case "addCollateral":
      tx = await authenticatedContractCall(contractClient.add_collateral, { lender, amount });
      break;
    case "withdrawCollateral":
      tx = await authenticatedContractCall(contractClient.withdraw_collateral, { lender, amount });
      break;
    case "borrowXAsset":
      tx = await authenticatedContractCall(contractClient.borrow_xasset, { lender, amount });
      break;
    case "repayDebt":
      tx = await authenticatedContractCall(contractClient.repay_debt, { lender, amount });
      break;
    case "liquidate":
      tx = await authenticatedContractCall(contractClient.liquidate_cdp, { lender });
      break;
    case "freeze":
      tx = await authenticatedContractCall(contractClient.freeze_cdp, { lender });
      break;
    case "close":
      tx = await authenticatedContractCall(contractClient.close_cdp, { lender });
      break;
    default:
      throw new Error("Invalid action");
  }

  const status = tx.getTransactionResponse.status;
  if (status === "SUCCESS") {
    return { message: "Transaction successful!", type: "success", lender, action };
  } else {
    return { message: "Transaction failed.", type: "error", lender, action };
  }
};

function Edit() {
  const { assetSymbol, lender } = useParams() as { lender: string, assetSymbol: XAssetSymbol};

  if (!assetSymbol) {
    return (
      <ErrorMessage
        title="Error: No Asset Selected"
        message="Please select an asset from the home page to view its stability pool."
      />
    );
  }
  
  if (!contractMapping[assetSymbol as XAssetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }
  const { data: cdp, isLoading: isLoadingCdp } = useContractCdp(assetSymbol, lender);
  const { data: metadata, isLoading: isLoadingMetadata } = useStabilityPoolMetadata(assetSymbol);
  const { account, isSignedIn } = useWallet();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const navigate = useNavigate();
  const actionData = useActionData() as ActionData;
  const decimals = 7;

  useEffect(() => {
    if (actionData) {
      setMessage({ text: actionData.message, type: actionData.type });
      
      if (actionData.type === 'success' && (actionData.action === 'close' || actionData.action === 'liquidate')) {
        navigate(`/cdps/${assetSymbol}`);
      } else {
        const timer = setTimeout(() => {
          setMessage(null);
          navigate(`/cdps/${assetSymbol}/${actionData.lender}`);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
    return;
  }, [actionData, navigate]);

  if (isLoadingCdp || isLoadingMetadata || !metadata) {
    return <div>Loading...</div>;
  }

  const isOwner = account === lender;

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <MuiLink component={RouterLink} to={`/cdps/${assetSymbol}/${lender}`} sx={{ display: 'block', mb: 2 }}>
          ← Back to CDP Details
        </MuiLink>
        <Typography variant="h4" gutterBottom>
          Edit CDP for <AddressDisplay address={lender} />
        </Typography>

        <Snackbar open={!!message} autoHideDuration={6000} onClose={() => setMessage(null)}>
          <Alert severity={message?.type || "info"} onClose={() => setMessage(null)}>
            {message?.text}
          </Alert>
        </Snackbar>

        {cdp && (
          <>
          <CDPDisplay
            cdp={cdp}
            decimals={decimals}
            lastpriceXLM={metadata.lastpriceXLM}
            lastpriceAsset={metadata.lastpriceAsset}
            symbolAsset={metadata.symbolAsset}
            lender={lender}
          />

            {isOwner && (
              <Form method="post">
                <input type="hidden" name="lender" value={lender} />
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  name="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputProps={{
                    step: `0.${'0'.repeat(decimals - 1)}1`
                  }}
                  sx={{ mb: 2 }}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Button fullWidth variant="contained" type="submit" name="action" value="addCollateral" disabled={!isSignedIn}>
                      Add Collateral
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Button fullWidth variant="contained" type="submit" name="action" value="withdrawCollateral" disabled={!isSignedIn}>
                      Withdraw Collateral
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Button fullWidth variant="contained" type="submit" name="action" value="borrowXAsset" disabled={!isSignedIn}>
                      Borrow {metadata.symbolAsset}
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Button fullWidth variant="contained" type="submit" name="action" value="repayDebt" disabled={!isSignedIn}>
                      Repay Debt
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Button fullWidth variant="contained" color="secondary" type="submit" name="action" value="close" disabled={!isSignedIn}>
                      Close CDP
                    </Button>
                  </Grid>
                </Grid>
              </Form>
            )}
            {cdp.status.tag === "Frozen" && (
              <Box mt={2}>
                <Form method="post">
                  <input type="hidden" name="lender" value={lender} />
                  <Button fullWidth variant="contained" color="error" type="submit" name="action" value="liquidate" disabled={!isSignedIn}>
                    Liquidate CDP
                  </Button>
                </Form>
              </Box>
            )}
            {cdp.status.tag === "Insolvent" && (
              <Box mt={2}>
                <Form method="post">
                  <input type="hidden" name="lender" value={lender} />
                  <Button fullWidth variant="contained" color="error" type="submit" name="action" value="freeze" disabled={!isSignedIn}>
                    Freeze CDP
                  </Button>
                </Form>
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}

export const element = <Edit />;