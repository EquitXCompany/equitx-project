import React from 'react';
import BigNumber from 'bignumber.js';
import type { CDP } from 'xasset';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Grid,
    useMediaQuery,
    useTheme,
} from '@mui/material';

interface CDPDisplayProps {
    cdp: CDP;
    decimals: number;
    lastpriceXLM: BigNumber;
    lastpriceAsset: BigNumber;
    symbolAsset: string;
    lender: string;
}

export const formatNumber = (value: BigNumber | number, decimalPlaces: number) => {
    return new BigNumber(value).toFixed(decimalPlaces);
};

const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
        case 'open':
            return 'green';
        case 'closed':
            return 'grey';
        case 'insolvent':
            return 'red';
        case 'frozen':
            return 'blue';
        default:
            return 'black';
    }
};

export const CDPDisplay: React.FC<CDPDisplayProps> = ({
    cdp,
    decimals,
    symbolAsset,
    lender,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const statusColor = getStatusColor(cdp.status.tag);

    return (
        <Card className="cdp-display">
            <CardContent>
                <Box className={`cdp-status`} mb={2} style={{ color: statusColor }}>
                    <Typography variant="h6" style={{ fontSize: '1.6rem' }}>Status: {cdp.status.tag}</Typography>
                </Box>
                <Box className="cdp-details">
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <Box className="cdp-detail" mb={1}>
                                <Typography variant="body2" color="textSecondary" style={{ fontSize: '1.2rem' }}>XLM Locked:</Typography>
                                <Typography variant="body1" style={{ fontSize: '1.5rem' }}>{formatNumber(new BigNumber(cdp.xlm_deposited.toString()).div(10 ** decimals), decimals)}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Box className="cdp-detail" mb={1}>
                                <Typography variant="body2" color="textSecondary" style={{ fontSize: '1.2rem' }}>{symbolAsset} Lent:</Typography>
                                <Typography variant="body1" style={{ fontSize: '1.5rem' }}>{formatNumber(new BigNumber(cdp.asset_lent.toString()).div(10 ** decimals), decimals)}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Box className="cdp-detail" mb={1}>
                                <Typography variant="body2" color="textSecondary" style={{ fontSize: '1.2rem' }}>Ratio:</Typography>
                                <Typography variant="body1" style={{ fontSize: '1.5rem' }}>{formatNumber(cdp.collateralization_ratio / 100, 2)}%</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </CardContent>
        </Card>
    );
};
