import { Button, Grid2 } from "@mui/material";
import { Link } from "react-router-dom";
import { useContractMapping } from "../../contexts/ContractMappingContext";

export function AssetLinks(props: React.ComponentProps<typeof Grid2>) {
  const contractMapping = useContractMapping();
  return (
    <Grid2 container columns={3} spacing={2} justifyContent="center" {...props}>
      {Object.keys(contractMapping).map((asset) => (
        <Button
          key={asset}
          component={Link}
          to={`/cdps/${asset}`}
          variant="outlined"
          size="small"
        >
          {asset}
        </Button>
      ))}
    </Grid2>
  );
}
