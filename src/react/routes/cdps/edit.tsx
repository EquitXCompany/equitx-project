import { useEffect, useState } from "react";
import {
  useParams,
  Link as RouterLink,
  Form,
  useNavigate,
  useActionData,
  useSubmit,
} from "react-router-dom";
import type { ActionFunction } from "react-router-dom";
import BigNumber from "bignumber.js";
import { useWallet } from "../../../wallet";
import { authenticatedContractCall } from "../../../utils/contractHelpers";
import { approveXlmForInterestPayment } from "../../../utils/sacContractHelper";
import { CDPDisplay } from "../../components/cdp/CDPDisplay";
import { useContractCdp } from "../../hooks/useCdps";
import {
  Button,
  TextField,
  Box,
  Container,
  Grid,
  Alert,
  Snackbar,
  Link as MuiLink,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
} from "@mui/material";
import { useStabilityPoolMetadata } from "../../hooks/useStabilityPoolMetadata";
import ErrorMessage from "../../components/errorMessage";
import { getContractBySymbol } from "../../../contracts/util";
import { useContractMapping } from "../../../contexts/ContractMappingContext";

interface ActionData {
  message: string;
  type: "success" | "error";
  lender: string;
  action: string;
}

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const lender = formData.get("lender") as string;
  const amount = new BigNumber(formData.get("amount") as string)
    .times(10 ** 7)
    .toFixed(0);
  const assetSymbol = params.assetSymbol;
  const contractMapping = JSON.parse(formData.get("contractMapping") as string); // Parse contractMapping from hidden input

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    throw new Error("Invalid asset symbol");
  }

  const contractClient = await getContractBySymbol(
    assetSymbol,
    contractMapping
  );

  let tx;
  switch (action) {
    case "addCollateral":
      tx = await authenticatedContractCall(contractClient.add_collateral, {
        lender,
        amount,
      });
      break;
    case "withdrawCollateral":
      tx = await authenticatedContractCall(contractClient.withdraw_collateral, {
        lender,
        amount,
      });
      break;
    case "borrowXAsset":
      tx = await authenticatedContractCall(contractClient.borrow_xasset, {
        lender,
        amount,
      });
      break;
    case "repayDebt":
      tx = await authenticatedContractCall(contractClient.repay_debt, {
        lender,
        amount,
      });
      break;
    case "liquidate":
      tx = await authenticatedContractCall(contractClient.liquidate_cdp, {
        lender,
      });
      break;
    case "freeze":
      tx = await authenticatedContractCall(contractClient.freeze_cdp, {
        lender,
      });
      break;
    case "close":
      tx = await authenticatedContractCall(contractClient.close_cdp, {
        lender,
      });
      break;
    case "payInterest":
      tx = await authenticatedContractCall(contractClient.pay_interest, {
        lender,
        amount,
      });
      break;
    default:
      throw new Error("Invalid action");
  }

  const status = tx.getTransactionResponse.status;
  if (status === "SUCCESS") {
    return {
      message: "Transaction successful!",
      type: "success",
      lender,
      action,
    };
  } else {
    return { message: "Transaction failed.", type: "error", lender, action };
  }
};

function Edit() {
  const { assetSymbol, lender } = useParams() as {
    lender: string;
    assetSymbol: string;
  };
  const contractMapping = useContractMapping();
  const { account, isSignedIn, signTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const navigate = useNavigate();
  const actionData = useActionData() as ActionData;
  const decimals = 7;

  // States for interest payment flow
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const [isProcessingInterest, setIsProcessingInterest] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [approvalAmount, setApprovalAmount] = useState<BigNumber | null>(null);

  if (!assetSymbol) {
    return (
      <ErrorMessage
        title="Error: No Asset Selected"
        message="Please select an asset from the home page to view its stability pool."
      />
    );
  }

  if (!contractMapping[assetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }
  const { data: cdp, isLoading: isLoadingCdp } = useContractCdp(
    assetSymbol,
    contractMapping,
    lender
  );
  const { data: metadata, isLoading: isLoadingMetadata } =
    useStabilityPoolMetadata(assetSymbol, contractMapping);
  const submit = useSubmit();

  useEffect(() => {
    if (actionData) {
      setMessage({ text: actionData.message, type: actionData.type });

      if (
        actionData.type === "success" &&
        (actionData.action === "close" || actionData.action === "liquidate")
      ) {
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

  const handleRepayDebt = async () => {
    if (!cdp || !metadata || !amount) return;

    setRepayAmount(amount);

    // Query backend for approvalAmount required for interest
    const accruedInterest = new BigNumber(
      cdp.accrued_interest.amount.toString()
    );

    if (accruedInterest.isGreaterThan(0)) {
      try {
        // Get contract addresses
        const xassetContractId = contractMapping[assetSymbol];
        if (!xassetContractId) throw new Error("asset not found");

        // Initialize contract client
        const contractClient = await getContractBySymbol(
          assetSymbol,
          contractMapping
        );

        // Use contract view to get approval info
        const interestDetail = await contractClient.get_accrued_interest({
          lender,
        });
        const approvalAmount = interestDetail.result.unwrap().amount.toString();
        setApprovalAmount(
          new BigNumber(approvalAmount)
        );
        setShowInterestDialog(true);
      } catch (e) {
        setMessage({
          text: `Failed to retrieve interest approval requirements: ${e instanceof Error ? e.message : "Unknown error."}`,
          type: "error",
        });
      }
    } else {
      submit(
        {
          lender,
          contractMapping: JSON.stringify(contractMapping),
          amount,
          action: "repayDebt",
        },
        { method: "post", action: "" }
      );
    }
  };

  const handleInterestApproval = async () => {
    if (!cdp || !metadata || !approvalAmount || !signTransaction) return;

    try {
      setIsProcessingInterest(true);

      // Get contract addresses
      const xassetContractId = contractMapping[assetSymbol];
      if (!xassetContractId) throw new Error("asset not found");
      // Get the XLM token contract address
      const xlmTokenAddress = metadata.sacAddress;

      // Call the approval function for XLM payment, using amount from contract view
      await approveXlmForInterestPayment(
        xlmTokenAddress,
        xassetContractId,
        account,
        approvalAmount.toString(),
        signTransaction
      );

      // Now submit the repay debt form
      submit(
        {
          lender,
          contractMapping: JSON.stringify(contractMapping),
          amount: repayAmount,
          action: "repayDebt",
        },
        { method: "post", action: "" }
      );
    } catch (error) {
      console.error("Error during interest approval:", error);
      setMessage({
        text: `Failed to approve XLM for interest payment: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      setIsProcessingInterest(false);
      setShowInterestDialog(false);
    }
  };

  if (isLoadingCdp || isLoadingMetadata || !metadata) {
    return <div>Loading...</div>;
  }

  const isOwner = account === lender;

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <MuiLink
          component={RouterLink}
          to={`/cdps/${assetSymbol}/${lender}`}
          sx={{ display: "block", mb: 2 }}
        >
          ← Back to CDP Details
        </MuiLink>

        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage(null)}
        >
          <Alert
            severity={message?.type || "info"}
            onClose={() => setMessage(null)}
          >
            {message?.text}
          </Alert>
        </Snackbar>

        {cdp && (
          <>
            <CDPDisplay
              cdp={cdp}
              decimals={decimals}
              interestRate={metadata.interestRate}
              lastpriceXLM={metadata.lastpriceXLM}
              lastpriceAsset={metadata.lastpriceAsset}
              symbolAsset={metadata.symbolAsset}
              lender={lender}
            />

            {isOwner && (
              <>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputProps={{
                    step: `0.${"0".repeat(decimals - 1)}1`,
                  }}
                  sx={{ mb: 2 }}
                />

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Form method="post">
                      <input type="hidden" name="lender" value={lender} />
                      <input
                        type="hidden"
                        name="contractMapping"
                        value={JSON.stringify(contractMapping)}
                      />
                      <input type="hidden" name="amount" value={amount} />
                      <Button
                        fullWidth
                        variant="contained"
                        type="submit"
                        name="action"
                        value="addCollateral"
                        disabled={!isSignedIn || !amount}
                      >
                        Add Collateral
                      </Button>
                    </Form>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Form method="post">
                      <input type="hidden" name="lender" value={lender} />
                      <input
                        type="hidden"
                        name="contractMapping"
                        value={JSON.stringify(contractMapping)}
                      />
                      <input type="hidden" name="amount" value={amount} />
                      <Button
                        fullWidth
                        variant="contained"
                        type="submit"
                        name="action"
                        value="withdrawCollateral"
                        disabled={!isSignedIn || !amount}
                      >
                        Withdraw Collateral
                      </Button>
                    </Form>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Form method="post">
                      <input type="hidden" name="lender" value={lender} />
                      <input
                        type="hidden"
                        name="contractMapping"
                        value={JSON.stringify(contractMapping)}
                      />
                      <input type="hidden" name="amount" value={amount} />
                      <Button
                        fullWidth
                        variant="contained"
                        type="submit"
                        name="action"
                        value="borrowXAsset"
                        disabled={!isSignedIn || !amount}
                      >
                        Borrow {metadata.symbolAsset}
                      </Button>
                    </Form>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Form method="post" id="repayDebtForm">
                      <input type="hidden" name="lender" value={lender} />
                      <input
                        type="hidden"
                        name="contractMapping"
                        value={JSON.stringify(contractMapping)}
                      />
                      <input type="hidden" name="amount" value={amount} />
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleRepayDebt}
                        disabled={!isSignedIn || !amount}
                      >
                        Repay Debt
                      </Button>
                      <input type="hidden" name="action" value="repayDebt" />
                    </Form>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Form method="post">
                      <input type="hidden" name="lender" value={lender} />
                      <input
                        type="hidden"
                        name="contractMapping"
                        value={JSON.stringify(contractMapping)}
                      />
                      <Button
                        fullWidth
                        variant="contained"
                        color="secondary"
                        type="submit"
                        name="action"
                        value="close"
                        disabled={!isSignedIn}
                      >
                        Close CDP
                      </Button>
                    </Form>
                  </Grid>

                  {new BigNumber(cdp.accrued_interest.amount.toString()).gt(
                    0
                  ) && (
                    <Grid item xs={6} sm={4}>
                      <Form method="post">
                        <input type="hidden" name="lender" value={lender} />
                        <input
                          type="hidden"
                          name="contractMapping"
                          value={JSON.stringify(contractMapping)}
                        />
                        <input
                          type="hidden"
                          name="amount"
                          value={new BigNumber(
                            cdp.accrued_interest.amount.toString()
                          ).toString()}
                        />
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          type="submit"
                          name="action"
                          value="payInterest"
                          disabled={!isSignedIn}
                        >
                          Pay Interest Only
                        </Button>
                      </Form>
                    </Grid>
                  )}
                </Grid>
              </>
            )}

            {cdp.status.tag === "Frozen" && (
              <Box mt={2}>
                <Form method="post">
                  <input type="hidden" name="lender" value={lender} />
                  <input
                    type="hidden"
                    name="contractMapping"
                    value={JSON.stringify(contractMapping)}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    type="submit"
                    name="action"
                    value="liquidate"
                    disabled={!isSignedIn}
                  >
                    Liquidate CDP
                  </Button>
                </Form>
              </Box>
            )}
            {cdp.status.tag === "Insolvent" && (
              <Box mt={2}>
                <Form method="post">
                  <input type="hidden" name="lender" value={lender} />
                  <input
                    type="hidden"
                    name="contractMapping"
                    value={JSON.stringify(contractMapping)}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    type="submit"
                    name="action"
                    value="freeze"
                    disabled={!isSignedIn}
                  >
                    Freeze CDP
                  </Button>
                </Form>
              </Box>
            )}

            {/* Interest Payment Dialog */}
            <Dialog
              open={showInterestDialog}
              onClose={() => setShowInterestDialog(false)}
            >
              <DialogTitle>Interest Payment Approval Required</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Your CDP has{" "}
                  {new BigNumber(cdp.accrued_interest.amount.toString())
                    .div(10 ** decimals)
                    .toFixed(decimals)}{" "}
                  {metadata.symbolAsset} in accrued interest.
                  <br />
                  <br />
                  Before repaying debt, you must approve{" "}
                  {approvalAmount
                    ? approvalAmount.div(10 ** decimals).toFixed(decimals)
                    : "---"}{" "}
                  XLM for interest payments.
                  <br />
                  <br />
                  <b>
                    This XLM approval is valid for the next 5 minutes (100
                    ledgers) and covers any outstanding interest that could
                    accrue while you complete this two-step wallet transaction.
                  </b>
                  <br />
                  After approving, you will be able to complete your repayment
                  in a second transaction.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setShowInterestDialog(false)}
                  color="primary"
                  disabled={isProcessingInterest}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInterestApproval}
                  color="primary"
                  disabled={isProcessingInterest}
                >
                  {isProcessingInterest ? (
                    <CircularProgress size={24} />
                  ) : (
                    "Approve XLM Payment"
                  )}
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    </Container>
  );
}

export const element = <Edit />;
