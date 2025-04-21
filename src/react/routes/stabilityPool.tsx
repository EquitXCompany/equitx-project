import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Typography, Button, Paper, Grid, TextField, Snackbar, CircularProgress, type AlertProps, Link as MuiLink } from '@mui/material';
import BigNumber from 'bignumber.js';
import { useWallet } from '../../wallet';
import { ContractErrors, getContractBySymbol } from '../../contracts/util';
import { authenticatedContractCall, unwrapResult } from '../../utils/contractHelpers';
import Alert from '@mui/material/Alert';
import ErrorMessage from '../components/errorMessage';
import { useContractMapping } from '../../contexts/ContractMappingContext';

const PRODUCT_CONSTANT_DECIMALS = 9;
const PRODUCT_CONSTANT = Math.pow(10, PRODUCT_CONSTANT_DECIMALS);

const MyAlert = React.forwardRef<HTMLDivElement, AlertProps>((
  props,
  ref,
) => <Alert elevation={6} ref={ref} variant="filled" {...props} />);

const parseErrorMessage = (error: any): string => {
  if (error instanceof Error) {
    const contractErrorMatch = error.message.match(/Error\(Contract, #(\d+)\)/);
    if (contractErrorMatch && contractErrorMatch[1] !== undefined) {
      const errorCode = parseInt(contractErrorMatch[1], 10);
      const contractError = ContractErrors[errorCode as keyof typeof ContractErrors];
      return contractError ? `Contract Error: ${contractError.message}` : error.message;
    }
    return "There was an error. Please try again."
  }
  return "There was an error. Please try again."
};


function StabilityPool() {
  const { assetSymbol } = useParams();
  if (!assetSymbol) {
    return (
      <ErrorMessage

        title="Error: No Asset Selected"
        message="Please select an asset from the home page to view its stability pool."
      />
    );
  }

  const contractMapping = useContractMapping();
  console.log("contractMapping", contractMapping)
  const { account, isSignedIn } = useWallet();
  const [totalXAsset, setTotalXAsset] = useState<BigNumber>(new BigNumber(0));
  const [totalCollateral, setTotalCollateral] = useState<BigNumber>(new BigNumber(0));
  const [poolConstants, setPoolConstants] = useState<any>(null);
  const [userDeposit, setUserDeposit] = useState<BigNumber>(new BigNumber(0));
  const [userRewards, setUserRewards] = useState<BigNumber>(new BigNumber(0));
  const [stakeAmount, setStakeAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [stakerPosition, setStakerPosition] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const xasset = getContractBySymbol(assetSymbol, contractMapping);

  const fetchData = async () => {
    setLoading(true);
    if(!xasset) { return; }
    try {
      const total_xasset = await xasset.get_total_xasset().then((tx: { result: any; }) =>
        tx.result
      );
      const total_collateral = await xasset.get_total_collateral().then((tx: { result: any; }) =>
        tx.result
      );
      setTotalXAsset(new BigNumber(total_xasset.toString()));
      setTotalCollateral(new BigNumber(total_collateral.toString()));
      const constants = await xasset.get_constants().then((tx: { result: any; }) =>
        tx.result
      );
      setPoolConstants(constants);

      if (account && isSignedIn) {
        try {
          const availableAssets = await xasset.get_available_assets({ staker: account }).then((tx) =>
            unwrapResult(tx.result, "Failed to retrieve available assets")
          );
          // Fetch staker position
          const position = await xasset.get_position({ staker: account }).then((tx) =>
            unwrapResult(tx.result, "Failed to retrieve staker position")
          );
          console.log(position)
          setStakerPosition(position);
          setUserDeposit(new BigNumber(availableAssets.available_xasset.toString()));
          setUserRewards(new BigNumber(availableAssets.available_rewards.toString()));
        } catch (error) {
          setUserDeposit(new BigNumber(0));
          setUserRewards(new BigNumber(0));
          setStakerPosition(null);
          console.error(parseErrorMessage(error));
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [account, isSignedIn]);



  const handleStake = async () => {
    if (!account || !isSignedIn || !xasset) return;
    setLoading(true);
    try {
      await authenticatedContractCall(xasset.stake, {
        from: account,
        amount: new BigNumber(stakeAmount).times(1e7).toFixed(0)
      });
      setSuccessMessage("Staking successful!");
      setTimeout(() => {
        fetchData();
      }, 3000); // Refresh data after 3 seconds
    } catch (error) {
      console.error("Error staking:", error);
      setErrorMessage(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!account || !isSignedIn || !xasset) return;
    setLoading(true);
    try {
      await authenticatedContractCall(xasset.unstake, { staker: account });
      setSuccessMessage("Unstaking successful!");
      setTimeout(() => {
        fetchData();
      }, 3000); // Refresh data after 3 seconds
    } catch (error) {
      console.error("Error unstaking:", error);
      setErrorMessage(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!account || !isSignedIn || !xasset) return;
    setLoading(true);
    try {
      await authenticatedContractCall(xasset.claim_rewards, { to: account });
      setSuccessMessage("Rewards claimed successfully!");
      setTimeout(() => {
        fetchData();
      }, 3000); // Refresh data after 3 seconds
    } catch (error) {
      console.error("Error claiming rewards:", error);
      setErrorMessage(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };


  const handleDeposit = async () => {
    if (!account || !isSignedIn || !xasset) return;
    setLoading(true);
    try {
      await authenticatedContractCall(xasset.deposit, {
        from: account,
        amount: new BigNumber(depositAmount).times(1e7).toFixed(0)
      });
      setSuccessMessage("Deposit successful!");
      setTimeout(() => {
        fetchData();
      }, 3000);
    } catch (error) {
      console.error("Error depositing:", error);
      setErrorMessage(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!account || !isSignedIn || !xasset) return;
    setLoading(true);
    try {
      await authenticatedContractCall(xasset.withdraw, {
        to: account,
        amount: new BigNumber(withdrawAmount).times(1e7).toFixed(0)
      });
      setSuccessMessage("Withdrawal successful!");
      setTimeout(() => {
        fetchData();
      }, 3000);
    } catch (error) {
      console.error("Error withdrawing:", error);
      setErrorMessage(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSuccessMessage('');
    setErrorMessage('');
  };

  if (!assetSymbol) {
    return (
      <ErrorMessage
        title="Error: No Asset Selected"
        message="Please select an asset to view its stability pool."
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

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <MuiLink component={RouterLink} to={`/`} sx={{ display: 'block', mb: 2 }}>
        ← Back to Home
      </MuiLink>
      <Typography variant="h5" gutterBottom>Stability Pool</Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Total xAsset
            </Typography>
            <Typography variant="h4">
              {totalXAsset.dividedBy(1e7).toFixed(7)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Total Collateral
            </Typography>
            <Typography variant="h4">
              {totalCollateral.dividedBy(1e7).toFixed(7)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Your Deposit
            </Typography>
            <Typography variant="h4">
              {userDeposit.dividedBy(1e7).toFixed(7)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Your Rewards
            </Typography>
            <Typography variant="h4">
              {userRewards.dividedBy(1e7).toFixed(7)}
            </Typography>
          </Paper>
        </Grid>
         {/* New grid item for pool constants */}
         <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Stability Pool Constants
            </Typography>
            {poolConstants ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    xAsset Deposit: {new BigNumber(poolConstants.xasset_deposit).dividedBy(1e7).toFixed(7)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    Product Constant: {new BigNumber(poolConstants.product_constant).dividedBy(PRODUCT_CONSTANT).toFixed(PRODUCT_CONSTANT_DECIMALS)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    Compounded Constant: {new BigNumber(poolConstants.compounded_constant).dividedBy(1e7).toFixed(7)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    Epoch: {new BigNumber(poolConstants.epoch).toFixed(0)}
                  </Typography>
                </Grid>
              </Grid>
            ) : (
              <Typography>Loading pool constants...</Typography>
            )}
          </Paper>
        </Grid>
        {stakerPosition && (
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Staker Position
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    xAsset Deposit: {new BigNumber(stakerPosition.xasset_deposit).dividedBy(1e7).toFixed(7)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    Product Constant: {new BigNumber(stakerPosition.product_constant).dividedBy(PRODUCT_CONSTANT).toFixed(PRODUCT_CONSTANT_DECIMALS)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    Compounded Constant: {new BigNumber(stakerPosition.compounded_constant).dividedBy(1e7).toFixed(7)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    Epoch: {new BigNumber(stakerPosition.epoch).toFixed(0)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
        <Grid item xs={12}>
          {userDeposit.isGreaterThan(0) ? (
            <>
              <TextField
                label="Deposit Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                fullWidth
                type="number"
                inputProps={{ step: '0.0000001' }}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Withdraw Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                fullWidth
                type="number"
                inputProps={{ step: '0.0000001' }}
                sx={{ mb: 2 }}
              />
            </>
          ) : (
            <TextField
              label="Stake Amount"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              fullWidth
              error={stakeAmount === '' || new BigNumber(stakeAmount).isLessThanOrEqualTo(0)}
              helperText={stakeAmount === '' || new BigNumber(stakeAmount).isLessThanOrEqualTo(0) ? "Please enter a valid amount" : ""}
              type="number"
              inputProps={{ step: '0.0000001' }}
              sx={{ mb: 2 }}
            />
          )}
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={2}>
            {userDeposit.isGreaterThan(0) ? (
              <>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="contained"
                    onClick={handleDeposit}
                    fullWidth
                    disabled={!isSignedIn || loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Deposit'}
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="contained"
                    onClick={handleWithdraw}
                    fullWidth
                    disabled={!isSignedIn || loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Withdraw'}
                  </Button>
                </Grid>
              </>
            ) : (
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  onClick={handleStake}
                  fullWidth
                  disabled={!isSignedIn || loading || stakeAmount === '' || new BigNumber(stakeAmount).isLessThanOrEqualTo(0)}
                >
                  {loading ? <CircularProgress size={24} /> : 'Stake'}
                </Button>
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                onClick={handleUnstake}
                fullWidth
                disabled={!isSignedIn || loading || userDeposit.isEqualTo(0)}
              >
                {loading ? <CircularProgress size={24} /> : 'Unstake'}
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                onClick={handleClaimRewards}
                fullWidth
                disabled={!isSignedIn || loading || userRewards.isEqualTo(0)}
              >
                {loading ? <CircularProgress size={24} /> : 'Claim Rewards'}
              </Button>
            </Grid>
          </Grid>
        </Grid>

      </Grid>

      <Snackbar open={!!successMessage} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <MyAlert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </MyAlert>
      </Snackbar>

      <Snackbar open={!!errorMessage} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <MyAlert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </MyAlert>
      </Snackbar>
    </Paper>
  );

}

export default StabilityPool;
