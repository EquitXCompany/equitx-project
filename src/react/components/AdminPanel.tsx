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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { deployAsset } from "../../utils/adminService";
import { useWallet } from "../../wallet";
import { getContractBySymbol } from "../../contracts/util";
import { useContractMapping } from "../../contexts/ContractMappingContext";
import { authenticatedContractCall } from "../../utils/contractHelpers";
import { useAllStabilityPoolMetadata } from "../hooks/useStabilityPoolMetadata";

import { Link as RouterLink } from "react-router-dom";

const DATAFEED_ADDRESS =
  "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";

export default function AdminPanel() {
  const { account, isSignedIn } = useWallet();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const contractMapping = useContractMapping();

  const {
    data: allPoolMetadata,
    isLoading: metadataLoading,
    refetch: refetchMetadata,
  } = useAllStabilityPoolMetadata(contractMapping);
  // Asset editing state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<string | null>(null);
  const [newMinRatio, setNewMinRatio] = useState<number>(0);
  const [newInterestRate, setNewInterestRate] = useState<number>(0);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

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
    partialSuccess: boolean;
    configErrors: string[];
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
      const firstAsset = Object.keys(contractMapping)[0] || "";
      const contract = getContractBySymbol(firstAsset, contractMapping);
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
        configErrors: deployResponse.errors || [],
        partialSuccess: deployResponse.errors?.length > 0,
      });

      if (deployResponse.errors?.length > 0) {
        // Partial success - contract deployed but configs couldn't be updated
        setSuccess(`Contract for x${newAsset.symbol} deployed, but configuration updates failed.`);
      } else {
        setSuccess(`Contract for x${newAsset.symbol} deployed successfully!`);
      }
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

  // Handle opening the edit dialog for a specific asset
  const handleEditAsset = (symbol: string) => {
    setCurrentAsset(symbol);

    if (allPoolMetadata && allPoolMetadata[symbol]) {
      const metadata = allPoolMetadata[symbol];
      // Divide by 100 to convert from contract format (11000) to percentage display (110.00)
      setNewMinRatio(metadata!.min_ratio / 100);
      setNewInterestRate(metadata!.interestRate / 100);
    }

    setEditDialogOpen(true);
    setUpdateError(null);
    setUpdateSuccess(null);
  };

  const handleUpdateMinRatio = async () => {
    if (!currentAsset) return;

    setLoading(true);
    setUpdateError(null);

    try {
      const contract = getContractBySymbol(currentAsset, contractMapping);
      const contractValue = Math.round(newMinRatio * 100);
      const result = await authenticatedContractCall(
        contract.set_min_collat_ratio,
        { to: contractValue }
      );

      const status = result.getTransactionResponse.status;
      if (status === "SUCCESS") {
        setUpdateSuccess(
          `Minimum collateralization ratio updated to ${newMinRatio}%`
        );
        // Refetch metadata to update the UI
        refetchMetadata();
      } else {
        throw new Error(`Transaction failed with status: ${status}`);
      }
    } catch (err: any) {
      console.error("Failed to update min ratio:", err);
      setUpdateError(
        `Failed to update minimum ratio: ${err.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInterestRate = async () => {
    if (!currentAsset) return;

    setLoading(true);
    setUpdateError(null);

    try {
      const contract = getContractBySymbol(currentAsset, contractMapping);
      const contractValue = Math.round(newInterestRate * 100);
      const result = await authenticatedContractCall(
        contract.set_interest_rate,
        { new_rate: contractValue }
      );

      const status = result.getTransactionResponse.status;
      if (status === "SUCCESS") {
        setUpdateSuccess(`Interest rate updated to ${newInterestRate}%`);
        // Refetch metadata to update the UI
        refetchMetadata();
      } else {
        throw new Error(`Transaction failed with status: ${status}`);
      }
    } catch (err: any) {
      console.error("Failed to update interest rate:", err);
      setUpdateError(
        `Failed to update interest rate: ${err.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
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
                <Alert 
                  severity={deploymentResult.partialSuccess ? "warning" : "success"} 
                  sx={{ mb: 3 }}
                >
                  <Typography variant="body1" fontWeight="bold">
                    {deploymentResult.partialSuccess 
                      ? "Contract deployed with configuration issues" 
                      : "Contract deployed successfully!"}
                  </Typography>
                  <Typography variant="body2">
                    Contract ID: {deploymentResult.contractId}
                  </Typography>
                  <Typography variant="body2">
                    Transaction: {deploymentResult.txHash}
                  </Typography>
                  
                  {deploymentResult.partialSuccess && (
                    <>
                      <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        Manual configuration required: The contract was deployed but server configurations could not be updated.
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Configuration errors:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {deploymentResult.configErrors.map((error, index) => (
                          <li key={index}>
                            <Typography variant="body2">
                              {error}
                            </Typography>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
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

      {metadataLoading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Contract ID</TableCell>
                <TableCell>Min Ratio</TableCell>
                <TableCell>Interest Rate</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(contractMapping).map(([symbol, contractId]) => {
                const metadata = allPoolMetadata
                  ? allPoolMetadata[symbol]
                  : undefined;

                return (
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
                      {metadata ? `${metadata.min_ratio / 100}%` : "Loading..."}
                    </TableCell>
                    <TableCell>
                      {metadata
                        ? `${metadata.interestRate / 100}%`
                        : "Loading..."}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          component={RouterLink}
                          to={`/cdps/${symbol}`}
                          target="_blank"
                          rel="noopener"
                        >
                          View in Explorer
                        </Button>
                        <IconButton
                          color="primary"
                          onClick={() =>
                            handleEditAsset(symbol)
                          }
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Asset Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit {currentAsset} Parameters</DialogTitle>
        <DialogContent>
          {updateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {updateError}
            </Alert>
          )}
          {updateSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {updateSuccess}
            </Alert>
          )}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Minimum Collateralization Ratio
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
              <TextField
                label="Min Ratio (%)"
                type="number"
                value={newMinRatio}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    // Round to 2 decimal places
                    const roundedValue = Math.round(value * 100) / 100;
                    setNewMinRatio(roundedValue);
                  }
                }}
                fullWidth
                inputProps={{ min: "100", step: "0.01" }} // Changed step to 0.01
              />
              <Button
                variant="contained"
                onClick={handleUpdateMinRatio}
                disabled={loading}
              >
                Update
              </Button>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Annual Interest Rate
            </Typography>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <TextField
                label="Interest Rate (%)"
                type="number"
                value={newInterestRate}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    // Round to 2 decimal places
                    const roundedValue = Math.round(value * 100) / 100;
                    setNewInterestRate(roundedValue);
                  }
                }}
                fullWidth
                inputProps={{ min: "0", step: "0.01" }}
              />
              <Button
                variant="contained"
                onClick={handleUpdateInterestRate}
                disabled={loading}
              >
                Update
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
