import { Box, Button, Grid2, Paper, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { useWallet } from "../../wallet";
import { AssetLinks } from "../components/AssetLinks";
import ErrorMessage from "../components/errorMessage";
import { useContractCdpForAllAssets, type ContractCDP } from "../hooks/useCdps";
import BigNumber from "bignumber.js";
import { useContractMapping } from "../../contexts/ContractMappingContext";
import {
    useAllStabilityPoolMetadata,
    type StabilityPoolMetadata,
} from "../hooks/useStabilityPoolMetadata";

export default function Portfolio() {
    const { account } = useWallet();
    const contractMapping = useContractMapping();
    const cdpQueries = useContractCdpForAllAssets(
        account || "",
        contractMapping
    );

    const { data: spData } = useAllStabilityPoolMetadata(contractMapping);
    if (!account) {
        return (
            <ErrorMessage
                title="Wallet Not Connected"
                message="Please connect your wallet to view your CDPs."
            />
        );
    }

    if (cdpQueries.every((q) => q.isSuccess && q.data[1] === null)) {
        return (
            <Box p="2rem 0">
                <Typography variant="h4" pb="2rem">
                    Looks like you don&apos;t have any open CDPs
                </Typography>

                <Typography pb="1rem">
                    Open one below to get started:
                </Typography>

                <AssetLinks />
            </Box>
        );
    }

    return (
        <Grid2 container columns={3} justifyContent="left" pb="10px" px="50px">
            {cdpQueries.map((query, index) => {
                const [asset, cdp] = query.data ?? [`xAsset-${index}`, null];
                return query.error ? (
                    <ErrorMessage
                        key={asset}
                        title={`Error Loading CDP: ${asset}`}
                        message={query.error.message}
                    />
                ) : (
                    <UserCDP
                        key={asset}
                        asset={asset}
                        cdp={cdp}
                        spData={spData?.[asset]}
                        account={account}
                        isLoading={query.isLoading}
                    />
                );
            })}
        </Grid2>
    );
}

function formatNumber(num: any) {
    const bN = new BigNumber(num);
    return bN.div(10 ** 7).toString();
}

function isCDPAtRisk(cdp: ContractCDP, spRatio: number): boolean {
    const cdpRatio = cdp.collateralization_ratio;

    return Math.abs(cdpRatio - spRatio) <= 0.1 * spRatio;
}

function UserCDP({
    account,
    asset,
    cdp,
    spData,
    isLoading,
}: {
    account: string;
    asset: string;
    cdp: ContractCDP | null;
    spData?: StabilityPoolMetadata;
    isLoading: boolean;
}) {
    const atRisk = !!cdp && !!spData && isCDPAtRisk(cdp, spData.min_ratio);
    const ratio =
        !!cdp && BigNumber(cdp.collateralization_ratio / 100).toFixed(2);

    return (
        <Paper
            sx={{
                p: 2,
                border: "1px solid",
                borderRadius: "4px",
                margin: 2,
                width: "25em",
                backgroundColor: atRisk ? "#D46565" : "",
            }}
        >
            <Typography variant="h5">{asset}</Typography>

            {isLoading && <p>Loading CDP...</p>}

            {cdp && (
                <>
                    <Typography>{cdp?.status.tag}</Typography>
                    {atRisk && (
                        <Typography variant="h6" color="white">
                            CDP is at risk of liquidation! Minimum ratio for{" "}
                            {asset} is {spData.min_ratio / 100}%
                        </Typography>
                    )}
                    <Typography>
                        {formatNumber(cdp.asset_lent)} {asset} lent
                    </Typography>
                    <Typography>Collateralization Ratio: {ratio}%</Typography>
                    <Typography>
                        {formatNumber(cdp.xlm_deposited)} XLM Locked
                    </Typography>
                    <Typography>
                        {formatNumber(cdp.accrued_interest.amount)} interest
                        accrued in {asset}
                    </Typography>
                    <Typography>
                        <Button
                            component={Link}
                            to={`/cdps/${asset}/${account}`}
                            variant="outlined"
                            size="small"
                        >
                            View CDP
                        </Button>
                    </Typography>
                </>
            )}
        </Paper>
    );
}
