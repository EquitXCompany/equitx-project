import { Box, Grid2, Link, Paper, Typography } from '@mui/material';
import { useWallet } from '../../wallet';
import ErrorMessage from '../components/errorMessage';
import { useContractCdpForAllAssets } from '../hooks/useCdps';
import BigNumber from 'bignumber.js';
import { useContractMapping } from '../../contexts/ContractMappingContext';

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
                {userCdpsMap && Object.entries(userCdpsMap).filter(([_, cdp]) => !!cdp).map(([asset, cdp]) => (
                    <Paper key={asset} sx={{ p: 2, border: '1px solid', borderRadius: '4px', margin: 2, minWidth: '20em' }}>
                        <Typography variant="h5">{asset}</Typography>
                        <Typography>{cdp?.status.tag}</Typography>
                        <Typography>{formatNumber(cdp?.asset_lent)} {asset} lent</Typography>
                        <Typography>Collateralization Ratio: {BigNumber(cdp?.collateralization_ratio!/100).toFixed(2)}%</Typography>
                        <Typography>{formatNumber(cdp?.xlm_deposited)} XLM Locked</Typography>
                        <Typography><Link
                            href={`#/cdps/${asset}/${account}`}
                            sx={{ textDecoration: 'none', color: 'primary.main' }}
                        >
                            View CDP
                        </Link></Typography>
                    </Paper>
                ))}
                </Grid2>
            </>
        )
        }
    </>);
}

function formatNumber(num :any) {
    const bN = new BigNumber(num);
    return bN.div(10**7).toString();
}