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
                <Grid2 container columns={3} justifyContent='center' pb='10px' px='50px'>
                {userCdpsMap && Object.entries(userCdpsMap).filter(([_, cdp]) => !!cdp).map(([asset, cdp]) => (
                    <Paper key={asset} sx={{ p: 2, border: '1px solid', borderRadius: '4px', margin: 2, minWidth: '10em' }}>
                        <Typography variant="h6">{asset}</Typography>
                        <Typography>{cdp?.status.tag}</Typography>
                        <Typography>Debt: {cdp?.asset_lent.toString()}</Typography>
                        <Typography>Ratio: {BigNumber(cdp?.collateralization_ratio!/100).toFixed(2)}%</Typography>
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