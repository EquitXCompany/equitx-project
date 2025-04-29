import { Box, Grid2, Link, Paper, Typography } from '@mui/material';
import { useWallet } from '../../wallet';
import ErrorMessage from '../components/errorMessage';
import { useContractCdpForAllAssets } from '../hooks/useCdps';
import BigNumber from 'bignumber.js';
import { useContractMapping } from '../../contexts/ContractMappingContext';
import { useAllStabilityPoolMetadata } from '../hooks/useStabilityPoolMetadata';

export default function Portfolio() {
    const { account } = useWallet();
    const contractMapping = useContractMapping();
    const {
        data: userCdpsMap,
        isLoading: userCdpsLoading,
        error: userCdpsError,
    } = useContractCdpForAllAssets(account || "", contractMapping, {
        enabled: !!account,
    });

    const { data: spData, isLoading: spLoading } = useAllStabilityPoolMetadata(contractMapping);

    function isCDPAtRisk(cdp: any, asset:any): boolean {
        if (spLoading) return false;
        const cdpRatio = cdp.collateralization_ratio;
        const spRatio = spData[asset]?.min_ratio!;

        const atRisk = Math.abs(cdpRatio - spRatio) <= 0.1 * spRatio;
        return atRisk;
    }

    return (<>
        {!account && (
            <ErrorMessage
                title="Wallet Not Connected"
                message="Please connect your wallet to view your CDPs."
            />)
        }
        {userCdpsLoading && (
            <Box sx={{ p: 2 }}>
                <Typography>Loading your CDPs...</Typography>
            </Box>
        )
        }{userCdpsError ? (
            <ErrorMessage
                title="Error Loading CDPs"
                message={userCdpsError.message}
            />
        ) : (
            <>
                <Grid2 container columns={3} justifyContent='left' pb='10px' px='50px'>
                    {userCdpsMap && Object.entries(userCdpsMap).filter(([_, cdp]) => !!cdp).map(([asset, cdp]) => {
                        const atRisk = isCDPAtRisk(cdp, asset);
                        return (
                        <Paper key={asset} sx={{ p: 2, border: '1px solid', borderRadius: '4px', margin: 2, width: '25em', backgroundColor: atRisk ? '#D46565' : '' }}>
                            <Typography variant="h5">{asset}</Typography>
                            <Typography>{cdp?.status.tag}</Typography>
                            {spData && atRisk && (
                                <Typography variant="h6" color="white">CDP is at risk of liquidation! Minimum ratio for {asset} is {spData[asset]!.min_ratio/100}%</Typography>
                            )}
                            <Typography>{formatNumber(cdp?.asset_lent)} {asset} lent</Typography>
                            <Typography>Collateralization Ratio: {BigNumber(cdp?.collateralization_ratio! / 100).toFixed(2)}%</Typography>
                            <Typography>{formatNumber(cdp?.xlm_deposited)} XLM Locked</Typography>
                            <Typography>{formatNumber(cdp?.accrued_interest.amount)} interest accrued in {asset}</Typography>
                            <Typography><Link
                                href={`#/cdps/${asset}/${account}`}
                                sx={{ textDecoration: 'none', color: 'primary.main' }}
                            >
                                View CDP
                            </Link></Typography>
                        </Paper>
                    )})}
                </Grid2>
            </>
        )
        }
    </>);
}

function formatNumber(num: any) {
    const bN = new BigNumber(num);
    return bN.div(10 ** 7).toString();
}