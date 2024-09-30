import { useEffect, useState } from "react";
import { useLoaderData, useParams, Link, Form, useNavigate, useActionData } from "react-router-dom";
import type { LoaderFunction, ActionFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import type { CDP } from "xasset";
import BigNumber from "bignumber.js";
import { useWallet } from "../../../wallet";
import { authenticatedContractCall } from "../../../utils/contractHelpers";
import { CDPDisplay } from "../../components/cdp/CDPDisplay";
import AddressDisplay from "../../components/cdp/AddressDisplay";
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

interface LoaderData {
  cdp: CDP;
  decimals: number;
  lastpriceXLM: BigNumber;
  lastpriceAsset: BigNumber;
  symbolAsset: string;
}

export const loader: LoaderFunction = async ({ params }): Promise<LoaderData> => {
  const { lender } = params as { lender: string };
  return {
    cdp: await xasset.cdp({ lender }).then((tx) => tx.result),
    decimals: 7, // FIXME: get from xasset (to be implemented as part of ft)
    lastpriceXLM: new BigNumber(await xasset.lastprice_xlm().then((t) => t.result.price)).div(10 ** 14),
    lastpriceAsset: new BigNumber(await xasset.lastprice_asset().then((t) => t.result.price)).div(10 ** 14),
    symbolAsset: "xUSD", // FIXME: get from xasset (to be implemented as part of ft)
  };
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const lender = formData.get("lender") as string;
  const amount = new BigNumber(formData.get("amount") as string).times(10 ** 7).toFixed(0);

  let tx;
  switch (action) {
    case "addCollateral":
      tx = await authenticatedContractCall(xasset.add_collateral, { lender, amount });
      break;
    case "withdrawCollateral":
      tx = await authenticatedContractCall(xasset.withdraw_collateral, { lender, amount });
      break;
    case "borrowXAsset":
      tx = await authenticatedContractCall(xasset.borrow_xasset, { lender, amount });
      break;
    case "repayDebt":
      tx = await authenticatedContractCall(xasset.repay_debt, { lender, amount });
      break;
    case "liquidate":
      tx = await authenticatedContractCall(xasset.liquidate_cdp, { lender });
      break;
    case "close":
      tx = await authenticatedContractCall(xasset.close_cdp, { lender });
      break;
    default:
      throw new Error("Invalid action");
  }

  const status = tx.getTransactionResponse.status;
  if (status === "SUCCESS") {
    return { message: "Transaction successful!", type: "success", lender };
  } else {
    return { message: "Transaction failed.", type: "error", lender };
  }
};

function Edit() {
  const { lender } = useParams() as { lender: string };
  const { cdp, decimals, lastpriceXLM, lastpriceAsset, symbolAsset } = useLoaderData() as LoaderData;
  const { account } = useWallet();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const navigate = useNavigate();
  const actionData = useActionData();

  useEffect(() => {
    if (actionData) {
      setMessage({ text: actionData.message, type: actionData.type });
      const timer = setTimeout(() => {
        setMessage(null);
        navigate(`/${actionData.lender}`);
      }, 3000); // Redirect after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [actionData, navigate]);

  const formatNumber = (value: BigNumber | number, decimalPlaces: number) => {
    return new BigNumber(value).toFixed(decimalPlaces);
  };

  const isOwner = account === lender;

  return (
    <>
      <Link to={`/${lender}`} className="back-link">← Back to CDP Details</Link>
      <h2>Edit CDP for <AddressDisplay lender={lender} /></h2>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      {cdp && (
        <>
          <CDPDisplay
            cdp={cdp}
            decimals={decimals}
            lastpriceXLM={lastpriceXLM}
            lastpriceAsset={lastpriceAsset}
            symbolAsset={symbolAsset}
            lender={lender}
          />

          {isOwner && (
            <Form method="post">
              <input type="hidden" name="lender" value={lender} />
              <label>
                Amount:
                <input
                  type="number"
                  name="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step={`0.${'0'.repeat(decimals - 1)}1`}
                />
              </label>
              <button type="submit" name="action" value="addCollateral">Add Collateral</button>
              <button type="submit" name="action" value="withdrawCollateral">Withdraw Collateral</button>
              <button type="submit" name="action" value="borrowXAsset">Borrow {symbolAsset}</button>
              <button type="submit" name="action" value="repayDebt">Repay Debt</button>
              <button type="submit" name="action" value="close">Close CDP</button>
            </Form>
          )}

          {cdp.status.tag === "Insolvent" && (
            <Form method="post">
              <input type="hidden" name="lender" value={lender} />
              <button type="submit" name="action" value="liquidate">Liquidate CDP</button>
            </Form>
          )}
        </>
      )}
    </>
  );
}

export const element = <Edit />;
