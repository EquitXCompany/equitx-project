import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { deployAsset } from "../../utils/adminService";
import { contractMapping, XAssetSymbol } from "../../contracts/contractConfig";
import { useWallet } from "../../wallet";
import { getContractBySymbol } from "../../contracts/util";

const DATAFEED_ADDRESS =
  "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";

export default function AdminPanel() {
  const { account, isSignedIn } = useWallet();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newAsset, setNewAsset] = useState({
    symbol: "",
    name: "",
    decimals: 7,
    minCollateralRatio: 110,
    annualInterestRate: 1,
    feedAddress: DATAFEED_ADDRESS, // Initialize with default feed address
  });

  const [deploymentResult, setDeploymentResult] = useState<{
    contractId: string;
    txHash: string;
  } | null>(null);

  const steps = ["Check Admin Access", "Configure Asset", "Deploy Contract"];

  useEffect(() => {
    if (isSignedIn && Object.keys(contractMapping).length > 0) {
      checkAdminStatus();
    }
  }, [isSignedIn]);

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      const firstAsset = Object.keys(contractMapping)[0] as XAssetSymbol;
      const contract = getContractBySymbol(firstAsset);
      const adminResult = await contract.admin_get({});
      const admin = adminResult.result;
      const isAdmin = Boolean(admin && admin === account);
      setIsAdmin(isAdmin);

      if (isAdmin) {
        setActiveStep(1);
      }
    } catch (err) {
      console.error("Failed to check admin status:", err);
      setError("Failed to verify admin status. Please try again.");
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAsset((prev) => ({
      ...prev,
      [name]: name === "symbol" ? value.toUpperCase() : value,
    }));
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setNewAsset((prev) => ({ ...prev, [name]: numValue }));
    }
  };

  const handleDecimalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Round to 2 decimal places to ensure precision
      const roundedValue = Math.round(numValue * 100) / 100;
      setNewAsset((prev) => ({ ...prev, [name]: roundedValue }));
    }
  };

  const deployContract = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const deployResponse = await deployAsset({
        symbol: newAsset.symbol,
        name: newAsset.name,
        decimals: newAsset.decimals,
        minCollateralRatio: newAsset.minCollateralRatio,
        annualInterestRate: newAsset.annualInterestRate,
        feedAddress: newAsset.feedAddress, // Pass the feed address to the API
      });
      setDeploymentResult({
        contractId: deployResponse.contractId,
        txHash: deployResponse.message,
      });

      setSuccess(`Contract for x${newAsset.symbol} deployed successfully!`);
      setActiveStep(3);
    } catch (err: any) {
      console.error("Contract deployment failed:", err);
      setError(`Failed to deploy contract: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    return (
      newAsset.symbol.length > 0 &&
      newAsset.name.length > 0 &&
      newAsset.decimals > 0 &&
      newAsset.minCollateralRatio >= 100 &&
      newAsset.annualInterestRate >= 0 &&
      newAsset.feedAddress.length > 0
    );
  };

  if (!isSignedIn) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          Please connect your wallet to access the admin panel.
        </Alert>
      </Box>
    );
  }

  if (isAdmin === false) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          Your account does not have admin privileges. Only the contract admin
          can access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body1" gutterBottom>
              Checking if {account} has admin privileges...
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={checkAdminStatus}
              disabled={loading}
            >
              Check Again
            </Button>
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure New xAsset
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
                mb: 3,
              }}
            >
              <TextField
                name="symbol"
                label="Asset Symbol (e.g. BTC)"
                value={newAsset.symbol}
                onChange={handleInputChange}
                fullWidth
                required
                helperText="The asset symbol will automatically be prefixed with 'x'"
              />

              <TextField
                name="name"
                label="Asset Name (e.g. Bitcoin xAsset)"
                value={newAsset.name}
                onChange={handleInputChange}
                fullWidth
                required
              />

              <TextField
                name="decimals"
                label="Decimals"
                type="number"
                value={newAsset.decimals}
                onChange={handleNumericChange}
                fullWidth
                required
              />
              <TextField
                name="minCollateralRatio"
                label="Minimum Collateral Ratio (%)"
                type="number"
                value={newAsset.minCollateralRatio}
                onChange={handleDecimalChange}
                fullWidth
                required
                inputProps={{ step: "0.01" }}
                helperText="E.g. 110 for 110%, allows decimals up to 2 places"
              />

              <TextField
                name="annualInterestRate"
                label="Annual Interest Rate (%)"
                type="number"
                value={newAsset.annualInterestRate}
                onChange={handleDecimalChange}
                fullWidth
                required
                inputProps={{ step: "0.01" }}
                helperText="E.g. 1 for 1%, allows decimals up to 2 places"
              />
              
              <TextField
                name="feedAddress"
                label="Price Feed Address"
                value={newAsset.feedAddress}
                onChange={handleInputChange}
                fullWidth
                required
                helperText="Default is the XLM price feed address"
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setActiveStep(2)}
                disabled={!validateForm() || loading}
              >
                Next: Deploy Contract
              </Button>
            </Box>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Deploy Contract
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Review Asset Configuration
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography>
                  <strong>Symbol:</strong> x{newAsset.symbol}
                </Typography>
                <Typography>
                  <strong>Name:</strong> {newAsset.name}
                </Typography>
                <Typography>
                  <strong>Decimals:</strong> {newAsset.decimals}
                </Typography>
                <Typography>
                  <strong>Min Collateral Ratio:</strong>{" "}
                  {newAsset.minCollateralRatio}%
                </Typography>
                <Typography>
                  <strong>Annual Interest Rate:</strong>{" "}
                  {newAsset.annualInterestRate}%
                </Typography>
                <Typography>
                  <strong>Price Feed:</strong> {newAsset.feedAddress}
                </Typography>
              </Paper>

              {deploymentResult && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="body1">
                    Contract deployed successfully!
                  </Typography>
                  <Typography variant="body2">
                    Contract ID: {deploymentResult.contractId}
                  </Typography>
                  <Typography variant="body2">
                    Transaction Hash: {deploymentResult.txHash}
                  </Typography>
                </Alert>
              )}

              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> This action will deploy a new xAsset
                  contract to the blockchain. This is an irreversible operation.
                  Please ensure all parameters are correct.
                </Typography>
              </Alert>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={deployContract}
                  disabled={loading || deploymentResult !== null}
                >
                  Deploy x{newAsset.symbol} Contract
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Current xAssets
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Contract ID</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(contractMapping).map(([symbol, contractId]) => (
              <TableRow key={symbol}>
                <TableCell>{symbol}</TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "300px",
                    }}
                  >
                    {contractId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    href={`/cdps/${symbol}`}
                    target="_blank"
                    rel="noopener"
                  >
                    View in Explorer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}