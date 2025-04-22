import { Box, Link, Typography } from '@mui/material';
import { useWallet } from '../../wallet';
import ErrorMessage from '../components/errorMessage';
import { convertContractCDPtoClientCDP, useContractCdpForAllAssets } from '../hooks/useCdps';
import BigNumber from 'bignumber.js';
import { useAllStabilityPoolMetadata } from '../hooks/useStabilityPoolMetadata';
import { useMemo } from 'react';
import { contractMapping, XAssetSymbol } from '../../contracts/contractConfig';
import { formatCurrency } from '../../utils/formatters';
import { DataGrid } from '@mui/x-data-grid';
import { useAssets } from '../hooks/useAssets';

export default function Portfolio() {
    const { account } = useWallet();
    const {
        data: userCdpsMap,
        isLoading: userCdpsLoading,
        error: userCdpsError,
    } = useContractCdpForAllAssets(account || "", {
        enabled: !!account,
    });
    const { data: assets } = useAssets();


    const { data: stabilityPoolData, isLoading: spLoading } =
        useAllStabilityPoolMetadata();

    const enrichedUserCdps = useMemo(() => {
        if (!userCdpsMap || !stabilityPoolData) return [];

        console.log("User CDPs Map:", userCdpsMap);
        return Object.entries(userCdpsMap)
            .filter(([_, cdp]) => cdp !== null) // Filter out null CDPs
            .map(([assetSymbol, contractCdp]) => {
                const contractId = contractMapping[assetSymbol as XAssetSymbol];
                const asset = assets?.find((v) => v.symbol === assetSymbol);
                if (!asset) return null;
                const cdp = convertContractCDPtoClientCDP(
                    contractCdp!,
                    asset,
                    contractId
                );
                const spMetadata = stabilityPoolData[assetSymbol as XAssetSymbol];
                if (!spMetadata || !cdp) return null;

                const collateralXLM = cdp.xlm_deposited;
                const debtAsset = cdp.asset_lent;
                const debtValueXLM = debtAsset
                    .times(spMetadata.lastpriceAsset)
                    .div(spMetadata.lastpriceXLM);

                const collateralRatio = collateralXLM.div(debtValueXLM).times(100);
                const netValue = collateralXLM.minus(debtValueXLM);
                const minRatio = new BigNumber(spMetadata.min_ratio).div(1e4);
                const liquidationPriceXLM = collateralXLM.div(debtAsset).div(minRatio);

                return {
                    ...cdp,
                    asset_symbol: assetSymbol,
                    collateralRatio: collateralRatio.toNumber(),
                    collateralXLM: formatCurrency(collateralXLM, 7, 2, "XLM"),
                    debtAsset: formatCurrency(debtAsset, 7, 2, assetSymbol),
                    debtValueXLM: formatCurrency(debtValueXLM, 7, 2, "XLM"),
                    netValue: formatCurrency(netValue, 7, 2, "XLM"),
                    liquidationPriceXLM: formatCurrency(liquidationPriceXLM, 0, 2, "XLM"),
                    contract_id: cdp.contract_id,
                    lender: cdp.lender,
                };
            })
            .filter((cdp): cdp is NonNullable<typeof cdp> => cdp !== null);
    }, [userCdpsMap, stabilityPoolData, assets]);


    const cdpColumns = [
        {
            field: "asset_symbol",
            headerName: "xAsset",
            width: 100,
            renderCell: (params: any) => (
                <Link
                    href={`/#/cdps/${params.row.asset_symbol}`}
                    underline="none"
                    color="inherit"
                    sx={{
                        textDecoration: "none",
                        "&:hover": {
                            textDecoration: "underline",
                        },
                        textAlign: "center",
                    }}
                >
                    {params.row.asset_symbol}
                </Link>
            ),
        },
        {
            field: "collateralRatio",
            headerName: "Collateral Ratio",
            width: 130,
            valueFormatter: (value: number) => {
                return `${value}%`;
            },
        },
        {
            field: "collateralXLM",
            headerName: "Collateral (XLM)",
            width: 130,
        },
        {
            field: "debtAsset",
            headerName: "Debt (xAsset)",
            width: 130,
        },
        {
            field: "debtValueXLM",
            headerName: "Debt Value (XLM)",
            width: 130,
        },
        {
            field: "netValue",
            headerName: "Net Value (XLM)",
            width: 130,
        },
        {
            field: "liquidationPriceXLM",
            headerName: "Liquidation Price (XLM)",
            width: 160,
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            renderCell: (params: any) => (
                <Link
                    href={`/#/cdps/${params.row.asset_symbol}/${account}`}
                    underline="none"
                    color="inherit"
                    sx={{
                        textDecoration: "none",
                        "&:hover": {
                            textDecoration: "underline",
                        },
                        textAlign: "center",
                    }}
                >
                    {params.row.status}
                </Link>
            ),
        },
    ];
    return (<>
        {!account && (
            <ErrorMessage
                title="Wallet Not Connected"
                message="Please connect your wallet to view your CDPs."
            />)
        } {spLoading || userCdpsLoading ? (
            <Box sx={{ p: 2 }}>
                <Typography>Loading your CDPs...</Typography>
            </Box>
        ) : userCdpsError ? (
            <ErrorMessage
                title="Error Loading CDPs"
                message={userCdpsError.message}
            />
        ) : (
            <Box sx={{ height: 600, width: "100%" }}>
                {enrichedUserCdps.length === 0 ? (
                    <Typography sx={{ p: 2 }}>
                        You don't have any active CDPs.
                    </Typography>
                ) : (
                    <DataGrid
                        rows={enrichedUserCdps}
                        columns={cdpColumns}
                        loading={userCdpsLoading || spLoading}
                        getRowId={(row) => `${row.contract_id}-${row.lender}`}
                        pageSizeOptions={[10, 25, 50]}
                    />
                )}
            </Box>
        )
        }
    </>);
}