import type { CDP, StakerPosition } from "xasset";

  export async function fetchCdps(): Promise<CDP[]> {
      try {
          const response = await fetch('https://api.mercurydata.app/retroshadesv1', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer YOUR_ACCESS_TOKEN', // Replace 'YOUR_ACCESS_TOKEN' with your real token
              },
              body: JSON.stringify({
                  query: "SELECT * FROM cdp_creation8de50571d8bb0fb3633ec22ad669aaaf"
              }),
          });

          if (!response.ok) {
              throw new Error("Failed to fetch CDPs from Mercury Data");
          }

          const data = await response.json();

          // Transform the data into the CDP type
          return data.map((item: any) => ({
              id: item.id,
              lender: '', // This field is not available in the response. Handle it appropriately.
              xlmDeposited: item.xlm_deposited,
              assetLent: item.asset_lent,
              collateralizationRatio: 0, // Calculation logic needed or use default if unknown
              status: '', // Determine status logic as per your application needs
              createdAt: new Date(item.timestamp * 1000).toISOString(),
              updatedAt: new Date(item.timestamp * 1000).toISOString(),
          }));
      } catch (error) {
          console.error(error);
          throw error;
      }
  }

  export async function fetchStakerPositions(): Promise<StakerPosition[]> {
    try {
      const response = await fetch('YOUR_SUBQUERY_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
          query {
            stakePositions {
              id
              staker
              xassetDeposit
              productConstant
              compoundedConstant
              epoch
              createdAt
              updatedAt
            }
          }
          `,
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch Stake Positions from SubQuery");
      }
  
      const json = await response.json();
      return json.data.stakePositions;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }